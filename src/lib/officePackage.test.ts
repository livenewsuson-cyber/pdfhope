import { describe, expect, it } from 'vitest'
import { validReverseOfficePackage } from './officePackage'

export function packagePrefix(...entries: string[]) {
  const encoder = new TextEncoder()
  return new Uint8Array(entries.flatMap(name => {
    const bytes = encoder.encode(name)
    const header = new Uint8Array(30)
    header.set([0x50, 0x4b, 0x03, 0x04])
    header[26] = bytes.length & 0xff
    header[27] = bytes.length >> 8
    return [...header, ...bytes]
  }))
}

describe('reverse Office output validation', () => {
  it('requires actual OOXML local-file entries for each target', () => {
    expect(validReverseOfficePackage(packagePrefix('[Content_Types].xml', 'xl/workbook.xml'), 'xlsx')).toBe(true)
    expect(validReverseOfficePackage(packagePrefix('[Content_Types].xml', 'ppt/presentation.xml'), 'pptx')).toBe(true)
    expect(validReverseOfficePackage(packagePrefix('[Content_Types].xml', 'xl/workbook.xml'), 'pptx')).toBe(false)
    expect(validReverseOfficePackage(packagePrefix('[Content_Types].xml', 'ppt/presentation.xml'), 'xlsx')).toBe(false)
  })

  it('rejects generic ZIP bytes and marker strings outside entry names', () => {
    expect(validReverseOfficePackage(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), 'xlsx')).toBe(false)
    const decoy = packagePrefix('random/file.txt')
    const bytes = new Uint8Array([...decoy, ...new TextEncoder().encode('[Content_Types].xml xl/workbook.xml')])
    expect(validReverseOfficePackage(bytes, 'xlsx')).toBe(false)
  })
})
