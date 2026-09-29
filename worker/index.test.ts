import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { validMagic } from './index'

describe('conversion upload signatures', () => {
  afterEach(() => vi.unstubAllGlobals())
  const officeOutput = (...names: string[]) => new Uint8Array(names.flatMap(name => {
    const value = new TextEncoder().encode(name)
    const header = new Uint8Array(30)
    header.set([0x50, 0x4b, 0x03, 0x04]); header[26] = value.length
    return [...Array.from(header), ...Array.from(value)]
  }))
  it('accepts only the expected signatures', () => {
    expect(validMagic(new Uint8Array([0x25,0x50,0x44,0x46,0x2d]), 'pdf')).toBe(true)
    expect(validMagic(new Uint8Array([0x50,0x4b,0x03,0x04]), 'docx')).toBe(true)
    expect(validMagic(new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]), 'doc')).toBe(true)
    expect(validMagic(new TextEncoder().encode('<script>'), 'pdf')).toBe(false)
    expect(validMagic(new Uint8Array([0x50,0x4b]), 'docx')).toBe(false)
    expect(validMagic(new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]), 'xls')).toBe(true)
    expect(validMagic(new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]), 'ppt')).toBe(true)
    const officeZip = (marker: string) => new Uint8Array([...Array.from(new Uint8Array([0x50,0x4b,0x03,0x04])), ...Array.from(new TextEncoder().encode(`[Content_Types].xml ${marker}`))])
    expect(validMagic(officeZip('xl/workbook.xml'), 'xlsx')).toBe(true)
    expect(validMagic(officeZip('ppt/presentation.xml'), 'pptx')).toBe(true)
    expect(validMagic(officeZip('random/file.txt'), 'xlsx')).toBe(false)
  })

  it('fails closed when the provider secret is absent', async () => {
    const bytes = new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x37])
    const request = new Request('https://pdfhope.com/api/convert/pdf-to-word', { method:'POST', body:bytes, headers:{'Content-Type':'application/pdf','Content-Length':String(bytes.length),'X-PDFHope-Filename':'sample.pdf','Origin':'https://pdfhope.com'} })
    const response = await worker.fetch(request, { CONVERSION_RATE_LIMITER:{ limit:async()=>({success:true}) } })
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ code:'service_not_configured' })
  })

  it('rejects oversized input before reading it', async () => {
    const request = new Request('https://pdfhope.com/api/convert/word-to-pdf', { method:'POST', body:new Uint8Array([1]), headers:{'Content-Type':'application/msword','Content-Length':String(20*1024*1024+1),'X-PDFHope-Filename':'sample.doc'} })
    const response = await worker.fetch(request, { CONVERSION_RATE_LIMITER:{ limit:async()=>({success:true}) } })
    expect(response.status).toBe(413)
  })

  it('streams a PDF through the OCR-enabled DOCX provider route', async () => {
    const provider = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input; void init
      return new Response(new Uint8Array([0x50,0x4b,0x03,0x04,1,2,3]), {status:200})
    })
    vi.stubGlobal('fetch', provider)
    const bytes = new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x37])
    const request = new Request('https://pdfhope.com/api/convert/pdf-to-word', { method:'POST', body:bytes, headers:{'Content-Type':'application/pdf','Content-Length':String(bytes.length),'X-PDFHope-Filename':'sample.pdf','Origin':'https://pdfhope.com'} })
    const response = await worker.fetch(request, { CONVERTAPI_TOKEN:'test-only', CONVERSION_RATE_LIMITER:{ limit:async()=>({success:true}) } })
    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer()).slice(0, 4)).toEqual(new Uint8Array([0x50,0x4b,0x03,0x04]))
    const [url, init] = provider.mock.calls[0]
    expect(String(url)).toContain('OcrMode=auto')
    expect((init as RequestInit).headers).toMatchObject({Authorization:'Bearer test-only',Accept:'application/octet-stream'})
  })

  it.each([['excel-to-pdf','xlsx','xl/workbook.xml'],['powerpoint-to-pdf','pptx','ppt/presentation.xml']])('streams %s to a PDF with a mode-specific rate key', async (mode, extension, marker) => {
    const provider = vi.fn(async (input: string | URL | Request) => { void input; return new Response(new TextEncoder().encode('%PDF-1.7\n'), { status: 200 }) })
    const rate = vi.fn(async () => ({ success: true }))
    vi.stubGlobal('fetch', provider)
    const bytes = new Uint8Array([...Array.from(new Uint8Array([0x50,0x4b,0x03,0x04])), ...Array.from(new TextEncoder().encode(`[Content_Types].xml ${marker}`))])
    const request = new Request(`https://pdfhope.com/api/convert/${mode}`, { method:'POST', body:bytes, headers:{'Content-Type':'application/octet-stream','Content-Length':String(bytes.length),'X-PDFHope-Filename':`sample.${extension}`,'Origin':'https://pdfhope.com'} })
    const response = await worker.fetch(request, { CONVERTAPI_TOKEN:'test-only', CONVERSION_RATE_LIMITER:{ limit:rate } })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(new TextDecoder().decode(await response.arrayBuffer())).toContain('%PDF-')
    expect(String(provider.mock.calls[0][0])).toContain(`/convert/${extension}/to/pdf`)
    expect(rate).toHaveBeenCalledWith({ key:`${mode}:unknown` })
  })

  it('rejects an invalid provider PDF response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not a pdf', { status:200 })))
    const bytes = new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])
    const request = new Request('https://pdfhope.com/api/convert/excel-to-pdf', { method:'POST', body:bytes, headers:{'Content-Type':'application/vnd.ms-excel','Content-Length':String(bytes.length),'X-PDFHope-Filename':'sample.xls'} })
    const response = await worker.fetch(request, { CONVERTAPI_TOKEN:'test-only', CONVERSION_RATE_LIMITER:{ limit:async()=>({success:true}) } })
    expect(response.status).toBe(502)
  })

  it.each([
    ['pdf-to-excel','xlsx','xl/workbook.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['pdf-to-powerpoint','pptx','ppt/presentation.xml','application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ])('streams %s as validated OOXML with its own rate key', async (mode, extension, marker, mime) => {
    const provider = vi.fn(async (input: string | URL | Request) => { void input; return new Response(officeOutput('[Content_Types].xml', marker), {status:200}) })
    const rate = vi.fn(async () => ({success:true}))
    vi.stubGlobal('fetch', provider)
    const bytes = new TextEncoder().encode('%PDF-1.7\n')
    const request = new Request(`https://pdfhope.com/api/convert/${mode}`, {method:'POST',body:bytes,headers:{'Content-Type':'application/pdf','Content-Length':String(bytes.length),'X-PDFHope-Filename':'report.pdf','Origin':'https://pdfhope.com'}})
    const response = await worker.fetch(request, {CONVERTAPI_TOKEN:'test-only',CONVERSION_RATE_LIMITER:{limit:rate}})
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(mime)
    expect(response.headers.get('Content-Disposition')).toContain(`report.${extension}`)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(String(provider.mock.calls[0][0])).toContain(`/convert/pdf/to/${extension}`)
    expect(String(provider.mock.calls[0][0])).toContain('OcrMode=auto')
    expect(String(provider.mock.calls[0][0])).toContain('StoreFile=false')
    expect(rate).toHaveBeenCalledWith({key:`${mode}:unknown`})
  })

  it.each(['pdf-to-excel','pdf-to-powerpoint'])('rejects arbitrary ZIP provider output for %s', async mode => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(officeOutput('random/file.txt'), {status:200})))
    const bytes = new TextEncoder().encode('%PDF-1.7\n')
    const request = new Request(`https://pdfhope.com/api/convert/${mode}`, {method:'POST',body:bytes,headers:{'Content-Type':'application/pdf','Content-Length':String(bytes.length),'X-PDFHope-Filename':'report.pdf'}})
    const response = await worker.fetch(request, {CONVERTAPI_TOKEN:'test-only',CONVERSION_RATE_LIMITER:{limit:async()=>({success:true})}})
    expect(response.status).toBe(502)
  })
})
