import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { validMagic } from './index'

describe('conversion upload signatures', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('accepts only the expected signatures', () => {
    expect(validMagic(new Uint8Array([0x25,0x50,0x44,0x46,0x2d]), 'pdf')).toBe(true)
    expect(validMagic(new Uint8Array([0x50,0x4b,0x03,0x04]), 'docx')).toBe(true)
    expect(validMagic(new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]), 'doc')).toBe(true)
    expect(validMagic(new TextEncoder().encode('<script>'), 'pdf')).toBe(false)
    expect(validMagic(new Uint8Array([0x50,0x4b]), 'docx')).toBe(false)
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
})
