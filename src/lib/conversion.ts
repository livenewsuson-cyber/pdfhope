import { safeBaseName } from './files'
import { validReverseOfficePackage } from './officePackage'

export const CONVERSION_MAX_BYTES = 20 * 1024 * 1024

export type ConversionMode = 'word-to-pdf' | 'pdf-to-word' | 'excel-to-pdf' | 'powerpoint-to-pdf' | 'pdf-to-excel' | 'pdf-to-powerpoint'

const officeTypes: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
}

const officeModes = {
  'word-to-pdf': { extensions: ['doc', 'docx'], marker: 'word/' },
  'excel-to-pdf': { extensions: ['xls', 'xlsx'], marker: 'xl/' },
  'powerpoint-to-pdf': { extensions: ['ppt', 'pptx'], marker: 'ppt/' },
} as const

export function validOfficeSignature(bytes: Uint8Array, extension: string, marker: string) {
  if (['doc', 'xls', 'ppt'].includes(extension)) return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return false
  const names = new TextDecoder('latin1').decode(bytes)
  return names.includes('[Content_Types].xml') && names.includes(marker)
}

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value)

export async function validateConversionFile(file: File, mode: ConversionMode) {
  if (!file.size) throw new Error('This file is empty. Please choose another file.')
  if (file.size > CONVERSION_MAX_BYTES) throw new Error('This file is larger than the 20 MB conversion limit.')
  const extension = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ''
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 256 * 1024)).arrayBuffer())
  if (mode === 'pdf-to-word' || mode === 'pdf-to-excel' || mode === 'pdf-to-powerpoint') {
    if (extension !== 'pdf') throw new Error('Please choose a PDF file.')
    if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) throw new Error('This file does not appear to be a valid PDF.')
    return
  }
  const { extensions, marker } = officeModes[mode]
  const label = mode === 'word-to-pdf' ? 'Word document' : mode === 'excel-to-pdf' ? 'Excel spreadsheet' : 'PowerPoint presentation'
  if (!(extensions as readonly string[]).includes(extension)) throw new Error(`Please choose a supported ${label}.`)
  if (['docx','xlsx','pptx'].includes(extension) && startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) throw new Error('This Office file appears to be password protected. Remove its password before converting.')
  if (!validOfficeSignature(bytes, extension, marker)) throw new Error(`This file does not appear to be a valid ${label}.`)
}

export function outputName(fileName: string, mode: ConversionMode) {
  const extension = mode === 'pdf-to-word' ? 'docx' : mode === 'pdf-to-excel' ? 'xlsx' : mode === 'pdf-to-powerpoint' ? 'pptx' : 'pdf'
  return `${safeBaseName(fileName)}.${extension}`
}

export async function convertDocument(file: File, mode: ConversionMode, signal: AbortSignal) {
  const response = await fetch(`/api/convert/${mode}`, {
    method: 'POST', body: file, signal,
    headers: {
      'Content-Type': officeTypes[file.name.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ''] ?? 'application/octet-stream',
      'X-PDFHope-Filename': encodeURIComponent(file.name),
    },
  })
  if (!response.ok) {
    let code = ''
    try { code = String((await response.json() as { code?: unknown }).code ?? '') } catch { /* sanitized fallback below */ }
    const messages: Record<string, string> = {
      invalid_file: mode === 'excel-to-pdf' ? 'This workbook appears to be damaged or unsupported.' : mode === 'powerpoint-to-pdf' ? 'This presentation appears to be damaged or unsupported.' : mode.startsWith('pdf-to-') ? 'This PDF appears to be damaged or unsupported.' : 'This file appears to be damaged or unsupported.',
      password_protected: mode.startsWith('pdf-to-') ? 'This PDF is password protected. Please remove the password and try again.' : 'This Office file is password protected. Please remove the password and try again.',
      no_tables: 'No useful tables were found in this PDF. Try a document with clearer rows and columns.',
      too_large: 'This file is larger than the 20 MB conversion limit.',
      rate_limited: 'Too many conversions were requested. Please wait a minute and try again.',
      timeout: 'Conversion took too long. Please try again.',
      quota_exhausted: 'The conversion service has reached its current usage limit. Please try again later.',
      service_not_configured: 'The conversion service is not configured yet. Please try again after the site owner adds its API secret.',
      provider_unavailable: 'The conversion service is temporarily unavailable. Please try again.',
      ocr_failed: 'OCR could not recognize usable content in this scanned PDF. Try a clearer scan.',
    }
    throw new Error(messages[code] ?? (response.status === 429 ? messages.rate_limited : 'Conversion failed. Please check the file and try again.'))
  }
  const blob = await response.blob()
  const signature = new Uint8Array(await blob.slice(0, mode === 'pdf-to-excel' || mode === 'pdf-to-powerpoint' ? 2 * 1024 * 1024 : 8).arrayBuffer())
  const valid = mode === 'pdf-to-excel' || mode === 'pdf-to-powerpoint'
    ? validReverseOfficePackage(signature, mode === 'pdf-to-excel' ? 'xlsx' : 'pptx')
    : mode === 'pdf-to-word' ? startsWith(signature, [0x50, 0x4b]) : startsWith(signature, [0x25, 0x50, 0x44, 0x46, 0x2d])
  if (!valid || !blob.size) throw new Error('The conversion service returned an invalid file. Please try again.')
  return blob
}
