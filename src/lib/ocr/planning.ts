import { parsePageSelection } from '../files'

export type OcrMode = 'smart' | 'force'
export type OcrQuality = 'balanced' | 'high'
export type OcrBox = { x0: number; y0: number; x1: number; y1: number }
export type PdfPointViewport = { convertToPdfPoint: (x: number, y: number) => number[] }

export function hasUsableTextLayer(items: readonly { str?: string }[]) {
  const words = items.map((item) => item.str?.trim() ?? '').filter(Boolean)
  const characters = words.join(' ').replace(/\s/g, '').length
  return characters >= 24 && (words.length >= 2 || words[0]?.length >= 24)
}

export function selectOcrPages(hasText: readonly boolean[], mode: OcrMode, customPages = '') {
  const selected = parsePageSelection(customPages, hasText.length)
  return selected.filter((index) => mode === 'force' || !hasText[index])
}

export function ocrRenderScale(width: number, height: number, quality: OcrQuality) {
  const desired = (quality === 'high' ? 300 : 220) / 72
  return Math.min(desired, 4096 / Math.max(width, height), Math.sqrt(12_000_000 / (width * height)))
}

export function mapOcrBox(viewport: PdfPointViewport, box: OcrBox) {
  const [x, y] = viewport.convertToPdfPoint(box.x0, box.y1)
  const [rightX, rightY] = viewport.convertToPdfPoint(box.x1, box.y1)
  const [topX, topY] = viewport.convertToPdfPoint(box.x0, box.y0)
  return {
    x,
    y,
    width: Math.hypot(rightX - x, rightY - y),
    height: Math.hypot(topX - x, topY - y),
    angle: Math.atan2(rightY - y, rightX - x) * 180 / Math.PI,
  }
}
