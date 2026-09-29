import { describe, expect, it } from 'vitest'
import { degrees, PDFDocument, StandardFonts } from 'pdf-lib'
import { addHeaderFooterPdf, defaultHeaderFooterOptions, headerFooterFilename, headerFooterPlacement, resolveHeaderFooterText, selectedHeaderFooterPages } from './headerFooter'

describe('header and footer text', () => {
  it('resolves only known tokens with the local export date', () => {
    expect(resolveHeaderFooterText('Page {page} of {pages} · {date} · {other}', 3, 10, new Date(2026, 8, 29))).toBe('Page 3 of 10 · 2026-09-29 · {other}')
  })
  it('uses the existing page range parser and can skip a cover', () => {
    expect(selectedHeaderFooterPages('1-3,5', 10, true)).toEqual([1, 2, 4])
    expect(() => selectedHeaderFooterPages('12', 10, false)).toThrow()
  })
  it('places left, center and right text inside portrait and rotated pages', () => {
    const left = headerFooterPlacement(612, 792, 0, 80, 10, 'left', 'top', 24)
    const center = headerFooterPlacement(612, 792, 0, 80, 10, 'center', 'top', 24)
    const right = headerFooterPlacement(612, 792, 0, 80, 10, 'right', 'top', 24)
    expect(left.x).toBe(18)
    expect(center.x).toBe(266)
    expect(right.x).toBe(514)
    expect(headerFooterPlacement(612, 792, 90, 80, 10, 'left', 'top', 24).rotate).toBe(90)
    expect(headerFooterPlacement(612, 792, 180, 80, 10, 'center', 'bottom', 24).rotate).toBe(180)
    expect(headerFooterPlacement(612, 792, 270, 80, 10, 'right', 'bottom', 24).rotate).toBe(270)
    expect(headerFooterPlacement(300, 400, 0, 80, 10, 'left', 'top', 999).y).toBeGreaterThanOrEqual(8)
  })
  it('uses a stable output name', () => expect(headerFooterFilename('Quarterly report.pdf')).toBe('Quarterly-report-header-footer.pdf'))
  it('adds content to existing pages without changing their rotation or page count', async () => {
    const source = await PDFDocument.create()
    const font = await source.embedFont(StandardFonts.Helvetica)
    source.addPage([612, 792]).drawText('Original searchable text', { x: 60, y: 400, font, size: 16 })
    source.addPage([612, 792]).setRotation(degrees(90))
    const input = new File([await source.save() as BlobPart], 'sample.pdf', { type: 'application/pdf' })
    const output = await addHeaderFooterPdf(input, { ...defaultHeaderFooterOptions, range: '1-2', skipFirst: true }, new Date(2026, 8, 29))
    expect(new TextDecoder().decode(await output.slice(0, 5).arrayBuffer())).toBe('%PDF-')
    const checked = await PDFDocument.load(await output.arrayBuffer())
    expect(checked.getPageCount()).toBe(2)
    expect(checked.getPage(1).getRotation().angle).toBe(90)
  })
})
