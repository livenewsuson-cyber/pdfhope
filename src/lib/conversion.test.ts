import { afterEach, describe, expect, it, vi } from 'vitest'
import { convertDocument, outputName, validateConversionFile, validOfficeSignature } from './conversion'

const ole = new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1,1])
const zip = (marker: string) => new Uint8Array([...new Uint8Array([0x50,0x4b,0x03,0x04]), ...new TextEncoder().encode(`[Content_Types].xml ${marker}`)])

describe('Office conversion validation', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('accepts the legacy OLE signatures for Word, Excel and PowerPoint', () => {
    for (const ext of ['doc','xls','ppt']) expect(validOfficeSignature(ole, ext, '')).toBe(true)
    expect(validOfficeSignature(new TextEncoder().encode('not office'), 'xls', '')).toBe(false)
  })
  it('requires OOXML package markers and rejects an arbitrary ZIP', () => {
    expect(validOfficeSignature(zip('xl/workbook.xml'), 'xlsx', 'xl/')).toBe(true)
    expect(validOfficeSignature(zip('ppt/presentation.xml'), 'pptx', 'ppt/')).toBe(true)
    expect(validOfficeSignature(zip('other/file.txt'), 'xlsx', 'xl/')).toBe(false)
    expect(validOfficeSignature(zip('xl/workbook.xml'), 'pptx', 'ppt/')).toBe(false)
  })
  it('validates the Excel and PowerPoint mode-specific file types', async () => {
    await expect(validateConversionFile(new File([zip('xl/workbook.xml') as BlobPart], 'book.xlsx'), 'excel-to-pdf')).resolves.toBeUndefined()
    await expect(validateConversionFile(new File([ole as BlobPart], 'book.xls'), 'excel-to-pdf')).resolves.toBeUndefined()
    await expect(validateConversionFile(new File([zip('ppt/presentation.xml') as BlobPart], 'deck.pptx'), 'powerpoint-to-pdf')).resolves.toBeUndefined()
    await expect(validateConversionFile(new File([ole as BlobPart], 'deck.ppt'), 'powerpoint-to-pdf')).resolves.toBeUndefined()
    await expect(validateConversionFile(new File([zip('random/file.txt') as BlobPart], 'book.xlsx'), 'excel-to-pdf')).rejects.toThrow('valid Excel spreadsheet')
  })
  it('keeps source-based PDF filenames', () => {
    expect(outputName('Quarterly budget.xlsx', 'excel-to-pdf')).toBe('Quarterly-budget.pdf')
    expect(outputName('Slides.pptx', 'powerpoint-to-pdf')).toBe('Slides.pdf')
    expect(outputName('Quarterly report.pdf', 'pdf-to-excel')).toBe('Quarterly-report.xlsx')
    expect(outputName('Slide deck.pdf', 'pdf-to-powerpoint')).toBe('Slide-deck.pptx')
  })
  it('accepts PDF inputs only for reverse Office conversion', async () => {
    const pdf = new File([new TextEncoder().encode('%PDF-1.7\n') as BlobPart], 'tables.pdf', { type:'application/pdf' })
    await expect(validateConversionFile(pdf, 'pdf-to-excel')).resolves.toBeUndefined()
    await expect(validateConversionFile(pdf, 'pdf-to-powerpoint')).resolves.toBeUndefined()
    await expect(validateConversionFile(new File(['not a PDF'], 'tables.pdf'), 'pdf-to-excel')).rejects.toThrow('valid PDF')
  })
  it('rejects random ZIP downloads instead of trusting the PK signature', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(zip('random/file.txt'), { status:200 })))
    const file = new File([new TextEncoder().encode('%PDF-1.7\n') as BlobPart], 'tables.pdf', {type:'application/pdf'})
    await expect(convertDocument(file, 'pdf-to-excel', new AbortController().signal)).rejects.toThrow('invalid file')
    await expect(convertDocument(file, 'pdf-to-powerpoint', new AbortController().signal)).rejects.toThrow('invalid file')
  })
})
