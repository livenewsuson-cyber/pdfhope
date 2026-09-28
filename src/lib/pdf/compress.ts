import { PDFDocument } from 'pdf-lib'
import { openRenderedPdf } from './render'

export type CompressionPreset = 'recommended' | 'strong' | 'maximum'
export const DEFAULT_COMPRESSION_PRESET: CompressionPreset = 'recommended'
export type CompressionProgress = { stage: 'analyzing' | 'compressing' | 'finalizing'; page: number; total: number }
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
}

const settings = {
  recommended: { dpi: 145, quality: .8 },
  strong: { dpi: 125, quality: .68 },
  maximum: { dpi: 105, quality: .55 },
} as const

export function compressionSavings(originalBytes: number, outputBytes: number) {
  const reductionBytes = Math.max(0, originalBytes - outputBytes)
  return { reductionBytes, reductionPercent: originalBytes ? reductionBytes / originalBytes * 100 : 0, noGain: outputBytes >= originalBytes }
}

const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

export async function compressPdf(file: File, { preset, onProgress }: {
  preset: CompressionPreset
  onProgress?: (progress: CompressionProgress) => void
}): Promise<CompressionResult> {
  const sourceBytes = new Uint8Array(await file.arrayBuffer())
  const rendered = await openRenderedPdf(file)
  let source: PDFDocument
  try { source = await PDFDocument.load(sourceBytes, { ignoreEncryption: false, updateMetadata: false }) }
  catch (error) { await rendered.cleanup(); throw error }
  const outputDoc = await PDFDocument.create()
  const rasterizedPages: number[] = [], preservedPages: number[] = []
  const total = rendered.numPages
  if (source.getPageCount() !== total) { await rendered.cleanup(); throw new Error('The PDF page count could not be verified for compression.') }
  const { dpi, quality } = settings[preset]

  try {
    const { OPS } = await import('pdfjs-dist')
    const imageOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat, OPS.paintInlineImageXObjectGroup, OPS.paintImageMaskXObject, OPS.paintImageMaskXObjectGroup])
    for (let number = 1; number <= total; number += 1) {
      onProgress?.({ stage: 'analyzing', page: number, total })
      const page = await rendered.getPage(number)
      let rasterize = preset !== 'recommended'
      if (!rasterize) {
        const text = await page.getTextContent()
        const hasUsableText = text.items.some((item) => 'str' in item && item.str.trim().length > 0)
        if (!hasUsableText) {
          const operators = await page.getOperatorList()
          rasterize = operators.fnArray.some((op) => imageOps.has(op))
        }
      }

      if (rasterize) {
        onProgress?.({ stage: 'compressing', page: number, total })
        const pointViewport = page.getViewport({ scale: 1 })
        const scale = Math.min(dpi / 72, 3200 / Math.max(pointViewport.width, pointViewport.height))
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
          const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode this PDF page.')), 'image/jpeg', quality))
          const image = await outputDoc.embedJpg(await jpeg.arrayBuffer())
          const outputPage = outputDoc.addPage([pointViewport.width, pointViewport.height])
          outputPage.drawImage(image, { x: 0, y: 0, width: pointViewport.width, height: pointViewport.height })
          rasterizedPages.push(number)
        } finally {
          canvas.width = 0
          canvas.height = 0
        }
      } else {
        const [copied] = await outputDoc.copyPages(source, [number - 1])
        outputDoc.addPage(copied)
        preservedPages.push(number)
      }
      page.cleanup()
      await nextFrame()
    }
    onProgress?.({ stage: 'finalizing', page: total, total })
    // A rewrite without rasterized pages offers no dependable size benefit and can
    // strip document-level features. Keep the original instead of calling it compression.
    if (!rasterizedPages.length) return { output: null, originalBytes: file.size, outputBytes: file.size, ...compressionSavings(file.size, file.size), originalPageCount: total, rasterizedPages, preservedPages, preset, flattened: false }
    const bytes = await outputDoc.save({ useObjectStreams: true })
    const candidate = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const savings = compressionSavings(file.size, candidate.size)
    return { output: savings.noGain ? null : candidate, originalBytes: file.size, outputBytes: candidate.size, ...savings, originalPageCount: total, rasterizedPages, preservedPages, preset, flattened: rasterizedPages.length === total }
  } finally {
    await rendered.cleanup()
  }
}
