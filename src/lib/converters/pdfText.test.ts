import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { extractDocumentText } from './pdfText'

describe('PDF to TXT with actual PDF parsing', () => {
  it('preserves multiple pages and warns about image-only pages', async () => {
    const source = await PDFDocument.create(), font = await source.embedFont(StandardFonts.Helvetica)
    source.addPage().drawText('First paragraph', {x:40,y:700,font,size:12})
    source.addPage().drawText('Café déjà vu', {x:40,y:700,font,size:12})
    source.addPage()
    const pdf = await pdfjs.getDocument({ data:await source.save() }).promise
    try {
      const result = await extractDocumentText(pdf)
      expect(result.text).toContain('First paragraph\n\n\f\n\nCafé déjà vu')
      expect(result.pages).toBe(3); expect(result.warnings[0]).toContain('Pages 3')
    } finally { await pdf.cleanup() }
  })
  it('rejects empty extraction and malformed PDFs', async () => {
    const source = await PDFDocument.create(); source.addPage()
    const pdf = await pdfjs.getDocument({data:await source.save()}).promise
    try { await expect(extractDocumentText(pdf)).rejects.toThrow('No usable') } finally { await pdf.cleanup() }
    await expect(pdfjs.getDocument({data:new TextEncoder().encode('%PDF-garbage')}).promise).rejects.toThrow()
  })
})
