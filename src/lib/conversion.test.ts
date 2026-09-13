import { describe, expect, it } from 'vitest'
import { outputName, validateConversionFile } from './conversion'

describe('conversion files', () => {
  it('validates PDF and Word signatures', async () => {
    await expect(validateConversionFile(new File([new Uint8Array([0x25,0x50,0x44,0x46,0x2d])], 'sample.pdf', {type:'application/pdf'}), 'pdf-to-word')).resolves.toBeUndefined()
    const docx = new File([new Uint8Array([0x50,0x4b,0x03,0x04]), '[Content_Types].xml word/document.xml'], 'sample.docx')
    await expect(validateConversionFile(docx, 'word-to-pdf')).resolves.toBeUndefined()
    await expect(validateConversionFile(new File(['not a pdf'], 'sample.pdf'), 'pdf-to-word')).rejects.toThrow('valid PDF')
  })

  it('creates safe output names', () => {
    expect(outputName('Quarterly report.docx', 'word-to-pdf')).toBe('Quarterly-report.pdf')
    expect(outputName('scan.pdf', 'pdf-to-word')).toBe('scan.docx')
  })
})
