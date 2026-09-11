import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'

describe('PDFium true text editing', () => {
  it('replaces a real PDF text object and keeps it extractable', async () => {
    vi.stubGlobal('fetch', async () => new Response(fs.readFileSync('node_modules/@embedpdf/pdfium/dist/pdfium.wasm')))
    const { loadPdfiumDocument } = await import('./index')
    const source = await PDFDocument.create()
    const font = await source.embedFont(StandardFonts.Helvetica)
    const page = source.addPage([300, 200])
    page.drawText('HELLO', { x: 40, y: 100, size: 24, font })
    const engine = await loadPdfiumDocument(new Uint8Array(await source.save()))
    const objects = engine.listTextObjects(0)
    expect(objects[0]?.text).toBe('HELLO')
    expect(objects[0]?.supported).toBe(true)
    engine.replaceTextObject(objects[0], 'WORLD')
    const exported = await engine.save()
    const check = await loadPdfiumDocument(exported)
    expect(check.pageCount).toBe(1)
    expect(check.listTextObjects(0).map((item) => item.text).join(' ')).toContain('WORLD')
    expect(check.listTextObjects(0).map((item) => item.text).join(' ')).not.toContain('HELLO')
    engine.close()
    engine.close()
    check.close()
    check.close()
  })
})

