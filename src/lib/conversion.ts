import { safeBaseName } from './files'

export const CONVERSION_MAX_BYTES = 20 * 1024 * 1024

export type ConversionMode = 'word-to-pdf' | 'pdf-to-word'

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value)

export async function validateConversionFile(file: File, mode: ConversionMode) {
  if (!file.size) throw new Error('This file is empty. Please choose another file.')
  if (file.size > CONVERSION_MAX_BYTES) throw new Error('This file is larger than the 20 MB conversion limit.')
  const extension = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ''
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 128 * 1024)).arrayBuffer())
  if (mode === 'pdf-to-word') {
    if (extension !== 'pdf') throw new Error('Please choose a PDF file.')
    if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) throw new Error('This file does not appear to be a valid PDF.')
    return
  }
  if (!['doc', 'docx'].includes(extension)) throw new Error('Please choose a DOC or DOCX Word document.')
  if (extension === 'doc') {
    if (!startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) throw new Error('This file does not appear to be a valid DOC document.')
    return
  }
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) throw new Error('This file does not appear to be a valid DOCX document.')
  const marker = new TextDecoder('latin1').decode(bytes)
  if (!marker.includes('[Content_Types].xml') && !marker.includes('word/')) throw new Error('This ZIP file does not appear to be a Word DOCX document.')
}

export function outputName(fileName: string, mode: ConversionMode) {
  return `${safeBaseName(fileName)}.${mode === 'word-to-pdf' ? 'pdf' : 'docx'}`
}

export async function convertDocument(file: File, mode: ConversionMode, signal: AbortSignal) {
  const response = await fetch(`/api/convert/${mode}`, {
    method: 'POST', body: file, signal,
    headers: {
      'Content-Type': file.type || (mode === 'pdf-to-word' ? 'application/pdf' : file.name.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword'),
      'X-PDFHope-Filename': encodeURIComponent(file.name),
    },
  })
  if (!response.ok) {
    let code = ''
    try { code = String((await response.json() as { code?: unknown }).code ?? '') } catch { /* sanitized fallback below */ }
    const messages: Record<string, string> = {
      invalid_file: 'This file appears to be damaged or unsupported.',
      password_protected: 'This PDF is password protected. Please remove the password and try again.',
      too_large: 'This file is larger than the 20 MB conversion limit.',
      rate_limited: 'Too many conversions were requested. Please wait a minute and try again.',
      timeout: 'Conversion took too long. Please try again.',
      quota_exhausted: 'The conversion service has reached its current usage limit. Please try again later.',
      service_not_configured: 'The conversion service is not configured yet. Please try again after the site owner adds its API secret.',
      provider_unavailable: 'The conversion service is temporarily unavailable. Please try again.',
      ocr_failed: 'OCR could not recognize editable text in this scanned PDF. Try a clearer scan.',
    }
    throw new Error(messages[code] ?? (response.status === 429 ? messages.rate_limited : 'Conversion failed. Please check the file and try again.'))
  }
  const blob = await response.blob()
  const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
  const valid = mode === 'word-to-pdf'
    ? startsWith(signature, [0x25, 0x50, 0x44, 0x46, 0x2d])
    : startsWith(signature, [0x50, 0x4b])
  if (!valid || !blob.size) throw new Error('The conversion service returned an invalid file. Please try again.')
  return blob
}
