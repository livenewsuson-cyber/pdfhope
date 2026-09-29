import { describe, expect, it } from 'vitest'
import { hasUsableTextLayer, mapOcrBox, ocrRenderScale, selectOcrPages } from './planning'

describe('OCR planning', () => {
  it('ignores empty and tiny fragments but keeps ordinary paragraphs and tables', () => {
    expect(hasUsableTextLayer([])).toBe(false)
    expect(hasUsableTextLayer([{ str: 'p. 1' }])).toBe(false)
    expect(hasUsableTextLayer([{ str: 'A normal paragraph contains many readable words.' }])).toBe(true)
    expect(hasUsableTextLayer([{ str: 'Item' }, { str: 'Amount' }, { str: 'Three books' }, { str: '$45.00' }])).toBe(true)
  })

  it('skips searchable pages in smart mode, respects a custom range, and forces all selected pages', () => {
    const hasText = [true, true, true, true, true, false, false, false, false, false]
    expect(selectOcrPages(hasText, 'smart')).toEqual([5, 6, 7, 8, 9])
    expect(selectOcrPages(hasText, 'smart', '1,6,8-9')).toEqual([5, 7, 8])
    expect(selectOcrPages(hasText, 'force', '1,6,8-9')).toEqual([0, 5, 7, 8])
  })

  it('caps poster-sized renderings without changing aspect ratio', () => {
    expect(ocrRenderScale(612, 792, 'balanced')).toBeCloseTo(220 / 72)
    expect(ocrRenderScale(612, 792, 'high')).toBeCloseTo(300 / 72)
    const scale = ocrRenderScale(6000, 4000, 'high')
    expect(6000 * scale).toBeLessThanOrEqual(4096)
    expect(6000 * 4000 * scale * scale).toBeLessThanOrEqual(12_000_000)
  })

  it.each([0, 90, 180, 270])('maps OCR boxes through a %i-degree PDF viewport', (rotation) => {
    const radians = rotation * Math.PI / 180
    const viewport = { convertToPdfPoint: (x: number, y: number): [number, number] => [x * Math.cos(radians) - y * Math.sin(radians), x * Math.sin(radians) + y * Math.cos(radians)] }
    const mapped = mapOcrBox(viewport, { x0: 10, y0: 20, x1: 110, y1: 40 })
    expect(mapped.width).toBeCloseTo(100)
    expect(mapped.height).toBeCloseTo(20)
    expect((mapped.angle + 360) % 360).toBeCloseTo(rotation)
  })
})
