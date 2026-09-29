export type ReverseOfficeTarget = 'xlsx' | 'pptx'

const startsWithZip = (bytes: Uint8Array) => bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04

// Inspect actual ZIP local-file headers, not incidental marker strings in a ZIP payload.
// ConvertAPI's OOXML output places these package entries near the start of the stream.
export function validReverseOfficePackage(bytes: Uint8Array, target: ReverseOfficeTarget) {
  if (!startsWithZip(bytes)) return false
  const required = target === 'xlsx' ? 'xl/workbook.xml' : 'ppt/presentation.xml'
  let contentTypes = false
  let mainPart = false
  for (let offset = 0; offset + 30 <= bytes.length; offset++) {
    if (bytes[offset] !== 0x50 || bytes[offset + 1] !== 0x4b || bytes[offset + 2] !== 0x03 || bytes[offset + 3] !== 0x04) continue
    const nameLength = bytes[offset + 26] | bytes[offset + 27] << 8
    const extraLength = bytes[offset + 28] | bytes[offset + 29] << 8
    if (nameLength < 1 || nameLength > 512 || offset + 30 + nameLength + extraLength > bytes.length) continue
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength))
    if (name === '[Content_Types].xml') contentTypes = true
    if (name === required) mainPart = true
    if (contentTypes && mainPart) return true
  }
  return false
}
