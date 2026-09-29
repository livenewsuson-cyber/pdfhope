import { degrees, PDFDocument, StandardFonts } from 'pdf-lib'
import { openRenderedPdf } from '../pdf/render'
import { hasUsableTextLayer, mapOcrBox, ocrRenderScale, selectOcrPages, type OcrMode, type OcrQuality } from './planning'

export type OcrAnalysis = { pageCount: number; hasText: boolean[]; existingText: string[]; dimensions: { width: number; height: number }[] }
export type OcrStage = { label: string; completed: number; total: number }
export type OcrResult = { output: Blob; pageCount: number; pagesOcred: number; pagesSkipped: number; recognizedWords: number; averageConfidence: number | null; extractedText: string; outputBytes: number }
export type OcrSettings = { mode: OcrMode; quality: OcrQuality; pages: string; language: 'eng' }

export class OcrCancelledError extends Error { constructor() { super('OCR cancelled.') } }
const ensureActive = (signal: AbortSignal) => { if (signal.aborted) throw new OcrCancelledError() }

export async function analyzeOcrFile(file: File): Promise<OcrAnalysis> {
  const signature = new TextDecoder().decode(new Uint8Array(await file.slice(0, 5).arrayBuffer()))
  if (signature !== '%PDF-') throw new Error('This file does not appear to be a valid PDF.')
  const source = await openRenderedPdf(file)
  const hasText: boolean[] = [], existingText: string[] = [], dimensions: { width: number; height: number }[] = []
  try {
    for (let number = 1; number <= source.numPages; number += 1) {
      const page = await source.getPage(number)
      const content = await page.getTextContent()
      const items = content.items.map((item) => ({ str: 'str' in item ? item.str : '' }))
      hasText.push(hasUsableTextLayer(items))
      existingText.push(items.map((item) => item.str).join(' ').trim())
      const viewport = page.getViewport({ scale: 1 })
      dimensions.push({ width: viewport.width, height: viewport.height })
    }
    return { pageCount: source.numPages, hasText, existingText, dimensions }
  } finally { await source.cleanup() }
}

function fontSafeWord(word: string, font: Awaited<ReturnType<PDFDocument['embedFont']>>) {
  try { font.encodeText(word); return word }
  catch {
    const normalized = word.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    return [...normalized].filter((character) => { try { font.encodeText(character); return true } catch { return false } }).join('')
  }
}

export async function runOcrPdf(file: File, analysis: OcrAnalysis, settings: OcrSettings, signal: AbortSignal, onStage: (stage: OcrStage) => void): Promise<OcrResult> {
  const pages = selectOcrPages(analysis.hasText, settings.mode, settings.pages)
  if (!pages.length) throw new Error('This PDF already appears to contain searchable text on the selected pages.')
  ensureActive(signal)
  const inputBytes = new Uint8Array(await file.arrayBuffer())
  const original = await PDFDocument.load(inputBytes)
  if (original.getPageCount() !== analysis.pageCount) throw new Error('The PDF changed during analysis. Choose it again.')
  const font = await original.embedFont(StandardFonts.Helvetica)
  const source = await openRenderedPdf(file)
  let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | null = null
  let terminated = false
  const recognizedText = [...analysis.existingText]
  let recognizedWords = 0, confidenceSum = 0, confidenceCount = 0
  const terminate = async () => { if (worker && !terminated) { terminated = true; await worker.terminate() } }
  const onAbort = () => { void terminate() }
  signal.addEventListener('abort', onAbort, { once: true })
  try {
    onStage({ label: 'Loading OCR language data', completed: 0, total: pages.length })
    const { createWorker } = await import('tesseract.js')
    ensureActive(signal)
    const loading = createWorker(settings.language, undefined, { workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/', workerBlobURL: false })
    worker = await loading
    ensureActive(signal)
    for (const [position, pageIndex] of pages.entries()) {
      ensureActive(signal)
      onStage({ label: `Recognizing page ${pageIndex + 1} of ${analysis.pageCount}`, completed: position, total: pages.length })
      const page = await source.getPage(pageIndex + 1)
      // Recognize in the page's unrotated coordinate space; PDF rotation metadata
      // remains on the original page and the word boxes map back to its PDF space.
      const base = page.getViewport({ scale: 1, rotation: 0 })
      const viewport = page.getViewport({ scale: ocrRenderScale(base.width, base.height, settings.quality), rotation: 0 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.ceil(viewport.width))
      canvas.height = Math.max(1, Math.ceil(viewport.height))
      try {
        const context = canvas.getContext('2d')
        if (!context) throw new Error('The browser could not create an OCR canvas.')
        await page.render({ canvas, canvasContext: context, viewport }).promise
        ensureActive(signal)
        const response = await worker.recognize(canvas, {}, { blocks: true, text: true })
        ensureActive(signal)
        const words = response.data.blocks?.flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words))) ?? []
        const pdfPage = original.getPage(pageIndex)
        const pageWords: string[] = []
        for (const word of words) {
          const text = fontSafeWord(word.text.trim(), font)
          if (!text || word.confidence < 20) continue
          const box = mapOcrBox(viewport, word.bbox)
          if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || box.width < 1 || box.height < 1) continue
          const size = Math.max(2, Math.min(box.height * .85, box.width / Math.max(font.widthOfTextAtSize(text, 1), .01)))
          pdfPage.drawText(text, { x: box.x, y: box.y, size, font, rotate: degrees(box.angle), opacity: 0 })
          pageWords.push(text)
          recognizedWords += 1
          confidenceSum += word.confidence
          confidenceCount += 1
        }
        recognizedText[pageIndex] = pageWords.join(' ')
      } finally { canvas.width = 0; canvas.height = 0; page.cleanup() }
      onStage({ label: `Recognized page ${pageIndex + 1} of ${analysis.pageCount}`, completed: position + 1, total: pages.length })
    }
    if (recognizedWords < 2) throw new Error('OCR could not find enough readable text. Try High accuracy, a clearer scan, or the correct language.')
    onStage({ label: 'Validating searchable PDF', completed: pages.length, total: pages.length })
    const bytes = await original.save()
    ensureActive(signal)
    const output = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
    const validation = await openRenderedPdf(new File([output], 'searchable.pdf', { type: 'application/pdf' }))
    try {
      if (validation.numPages !== analysis.pageCount) throw new Error('OCR output lost pages.')
      for (let index = 0; index < analysis.pageCount; index += 1) {
        const page = await validation.getPage(index + 1)
        const view = page.getViewport({ scale: 1 })
        if (Math.abs(view.width - analysis.dimensions[index].width) > 1 || Math.abs(view.height - analysis.dimensions[index].height) > 1) throw new Error('OCR output changed a page size.')
        if (pages.includes(index)) {
          const content = await page.getTextContent()
          const extracted = content.items.map((item) => 'str' in item ? item.str : '').join(' ')
          const firstWord = recognizedText[index].split(/\s+/).find((part) => part.length >= 3)
          if (!firstWord || !extracted.toLowerCase().includes(firstWord.toLowerCase())) throw new Error('The OCR text layer could not be read from the output PDF.')
        }
      }
    } finally { await validation.cleanup() }
    const extractedText = recognizedText.map((text, index) => `--- Page ${index + 1} ---\n${text}`).join('\n\n')
    return { output, pageCount: analysis.pageCount, pagesOcred: pages.length, pagesSkipped: analysis.pageCount - pages.length, recognizedWords, averageConfidence: confidenceCount ? Math.round(confidenceSum / confidenceCount) : null, extractedText, outputBytes: output.size }
  } finally {
    signal.removeEventListener('abort', onAbort)
    await terminate()
    await source.cleanup()
  }
}
