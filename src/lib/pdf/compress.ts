import { PDFDocument } from 'pdf-lib'
import { OPS, type PDFDocumentProxy } from 'pdfjs-dist'
import { openRenderedPdf } from './render'
import { candidatePageCountMatches, chooseCompressionCandidate, type CompressionCandidate, type CompressionMethod, type TextPreservation } from './compressionCandidates'

export type CompressionPreset = 'recommended' | 'strong' | 'maximum'
export const DEFAULT_COMPRESSION_PRESET: CompressionPreset = 'recommended'
export type CompressionProgress = { stage: 'optimizing' | 'analyzing' | 'compressing' | 'validating' | 'finalizing'; page: number; total: number }
export type CompressionResult = {
  output: Blob | null
  originalBytes: number
  outputBytes: number
  reductionBytes: number
  reductionPercent: number
  originalPageCount: number
  rasterizedPages: number[]
  preservedPages: number[]
  preset: CompressionPreset
  flattened: boolean
  noGain: boolean
  optimizationMethods: CompressionMethod[]
  textPreservation: TextPreservation
  hadSearchableText: boolean | null
  structuralBytes: number | null
  scanCandidateBytes: number | null
  structuralStatus: 'complete' | 'failed' | 'not-used'
}

const settings = {
  recommended: { dpi: 145, quality: .8 },
  strong: { dpi: 125, quality: .68 },
  maximum: { dpi: 105, quality: .55 },
} as const
const imageOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat, OPS.paintInlineImageXObjectGroup, OPS.paintImageMaskXObject, OPS.paintImageMaskXObjectGroup])
const nextFrame = () => new Promise<void>(resolve => setTimeout(resolve, 0))

export function compressionSavings(originalBytes: number, outputBytes: number) {
  const reductionBytes = Math.max(0, originalBytes - outputBytes)
  return { reductionBytes, reductionPercent: originalBytes ? reductionBytes / originalBytes * 100 : 0, noGain: outputBytes >= originalBytes }
}

// PDF.js reopens every output; sample large documents for dimensions, order and text.
async function validCandidate(original: PDFDocumentProxy, bytes: Uint8Array, preserveText: boolean): Promise<boolean> {
  let candidate: PDFDocumentProxy | null = null
  try {
    candidate = await openRenderedPdf(new File([bytes as BlobPart], 'candidate.pdf', { type: 'application/pdf' }))
    if (!candidatePageCountMatches(original.numPages, candidate.numPages)) return false
    const pages = original.numPages <= 40 ? Array.from({ length: original.numPages }, (_, i) => i + 1) : [...new Set([1, Math.ceil(original.numPages / 2), original.numPages])]
    for (const number of pages) {
      const before = await original.getPage(number), after = await candidate.getPage(number)
      const a = before.getViewport({ scale: 1 }), b = after.getViewport({ scale: 1 })
      if (Math.abs(a.width - b.width) > .1 || Math.abs(a.height - b.height) > .1) return false
      if (preserveText) {
        const text = async (page: typeof before) => (await page.getTextContent()).items.filter(item => 'str' in item).map(item => item.str).join('')
        if (await text(before) !== await text(after)) return false
      }
      before.cleanup(); after.cleanup()
    }
    return true
  } catch { return false }
  finally { await candidate?.cleanup() }
}

async function likelyScanPages(pdf: PDFDocumentProxy, onProgress?: (value: CompressionProgress) => void) {
  const scans = new Set<number>()
  let hadSearchableText = false
  for (let number = 1; number <= pdf.numPages; number += 1) {
    onProgress?.({ stage: 'analyzing', page: number, total: pdf.numPages })
    const page = await pdf.getPage(number)
    const text = await page.getTextContent()
    const hasText = text.items.some(item => 'str' in item && item.str.trim().length > 0)
    hadSearchableText ||= hasText
    if (!hasText) {
      const operators = await page.getOperatorList()
      if (operators.fnArray.some(op => imageOps.has(op))) scans.add(number)
    }
    page.cleanup()
    await nextFrame()
  }
  return { scans, hadSearchableText }
}

async function documentHasText(pdf: PDFDocumentProxy) {
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number)
    const text = await page.getTextContent()
    page.cleanup()
    if (text.items.some(item => 'str' in item && item.str.trim().length > 0)) return true
  }
  return false
}

// pdf-lib page reconstruction may omit document-level data. Protect those PDFs.
async function hasDocumentFeatures(pdf: PDFDocumentProxy) {
  if ((await pdf.getOutline())?.length || (await pdf.getFieldObjects())?.size || (await pdf.getAttachments())?.size) return true
  for (let number = 1; number <= pdf.numPages; number += 1) {
    if ((await (await pdf.getPage(number)).getAnnotations({ intent: 'display' })).length) return true
  }
  return false
}

async function rasterCandidate(file: File, pdf: PDFDocumentProxy, pages: Set<number>, preset: CompressionPreset, onProgress?: (value: CompressionProgress) => void): Promise<CompressionCandidate> {
  const source = pages.size === pdf.numPages ? null : await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false, updateMetadata: false })
  const output = await PDFDocument.create()
  const rasterizedPages: number[] = [], preservedPages: number[] = []
  const { dpi, quality } = settings[preset]
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number)
    try {
      if (pages.has(number)) {
        onProgress?.({ stage: 'compressing', page: number, total: pdf.numPages })
        const points = page.getViewport({ scale: 1 })
        const scale = Math.min(dpi / 72, 3200 / Math.max(points.width, points.height))
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(viewport.width))
        canvas.height = Math.max(1, Math.round(viewport.height))
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) throw new Error('A browser canvas is required to compress PDF pages.')
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        try {
          await page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' }).promise
          const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not encode this PDF page.')), 'image/jpeg', quality))
          const image = await output.embedJpg(await jpeg.arrayBuffer())
          output.addPage([points.width, points.height]).drawImage(image, { x: 0, y: 0, width: points.width, height: points.height })
          rasterizedPages.push(number)
        } finally { canvas.width = 0; canvas.height = 0 }
      } else {
        const [copied] = await output.copyPages(source!, [number - 1])
        output.addPage(copied)
        preservedPages.push(number)
      }
    } finally { page.cleanup() }
    await nextFrame()
  }
  const bytes = new Uint8Array(await output.save({ useObjectStreams: true }))
  return { bytes, methods: [preset === 'recommended' ? 'scanned-page recompression' : 'page rasterization'], textPreservation: preset === 'recommended' ? 'preserved' : 'flattened', rasterizedPages, preservedPages }
}

export async function compressPdf(file: File, { preset, onProgress }: { preset: CompressionPreset; onProgress?: (progress: CompressionProgress) => void }): Promise<CompressionResult> {
  const pdf = await openRenderedPdf(file)
  const total = pdf.numPages
  const allPages = Array.from({ length: total }, (_, i) => i + 1)
  const candidates: CompressionCandidate[] = []
  let structuralBytes: number | null = null, scanCandidateBytes: number | null = null
  let structuralStatus: CompressionResult['structuralStatus'] = preset === 'recommended' ? 'failed' : 'not-used'
  let structuralError: unknown = null, rasterError: unknown = null
  let hadSearchableText: boolean | null = null
  try {
    if (preset === 'recommended') {
      onProgress?.({ stage: 'optimizing', page: 0, total })
      try {
        const { structuralOptimize } = await import('./structuralOptimize')
        const bytes = await structuralOptimize(file)
        structuralBytes = bytes.length
        onProgress?.({ stage: 'validating', page: 0, total })
        if (!(await validCandidate(pdf, bytes, true))) throw new Error('The structural output did not pass PDF validation.')
        structuralStatus = 'complete'
        candidates.push({ bytes, methods: ['structural'], textPreservation: 'preserved', rasterizedPages: [], preservedPages: allPages })
      } catch (error) { structuralError = error }
      let scans = new Set<number>(), safeToRebuild = false
      try {
        const analysis = await likelyScanPages(pdf, onProgress)
        scans = analysis.scans
        hadSearchableText = analysis.hadSearchableText
        safeToRebuild = scans.size > 0 && !(await hasDocumentFeatures(pdf))
      } catch (error) {
        if (!candidates.length) throw error
      }
      if (safeToRebuild) {
        try {
          const raster = await rasterCandidate(file, pdf, scans, preset, onProgress)
          scanCandidateBytes = raster.bytes.length
          onProgress?.({ stage: 'validating', page: 0, total })
          if (!(await validCandidate(pdf, raster.bytes, true))) throw new Error('The scanned-page output did not pass PDF validation.')
          candidates.push(raster)
        } catch (error) { rasterError = error }
      }
      if (structuralError && rasterError) throw new Error('Both structural and scanned-page compression failed. Try a smaller file or another browser.')
    } else {
      hadSearchableText = await documentHasText(pdf)
      const raster = await rasterCandidate(file, pdf, new Set(allPages), preset, onProgress)
      scanCandidateBytes = raster.bytes.length
      onProgress?.({ stage: 'validating', page: 0, total })
      if (!(await validCandidate(pdf, raster.bytes, false))) throw new Error('The compressed PDF did not pass validation.')
      candidates.push(raster)
    }
    onProgress?.({ stage: 'finalizing', page: total, total })
    const best = chooseCompressionCandidate(file.size, candidates, preset === 'recommended')
    const outputBytes = best?.bytes.length ?? (candidates.length ? Math.min(...candidates.map(candidate => candidate.bytes.length)) : file.size)
    return {
      output: best ? new Blob([best.bytes as BlobPart], { type: 'application/pdf' }) : null,
      originalBytes: file.size, outputBytes, ...compressionSavings(file.size, outputBytes), originalPageCount: total,
      rasterizedPages: (best ?? candidates[0])?.rasterizedPages ?? [], preservedPages: (best ?? candidates[0])?.preservedPages ?? allPages,
      preset, flattened: best?.textPreservation === 'flattened', noGain: !best,
      optimizationMethods: best?.methods ?? [], textPreservation: best?.textPreservation ?? 'preserved',
      hadSearchableText,
      structuralBytes, scanCandidateBytes, structuralStatus,
    }
  } finally { await pdf.cleanup() }
}
