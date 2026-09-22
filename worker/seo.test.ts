import { describe, expect, it, vi } from 'vitest'
import worker from './index'

const limiter = { limit: async () => ({ success: true }) }
describe('SEO delivery without changing conversion endpoints', () => {
  it('301 redirects www to HTTPS non-www and preserves path and query', async () => {
    const fetch = vi.fn()
    const response = await worker.fetch(new Request('https://www.pdfhope.com/merge-pdf?source=test'), { ASSETS: { fetch }, CONVERSION_RATE_LIMITER: limiter })
    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('https://pdfhope.com/merge-pdf?source=test')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('redirects HTTP requests to the production HTTPS origin', async () => {
    const response = await worker.fetch(new Request('http://pdfhope.com/pdf-reader'), { CONVERSION_RATE_LIMITER: limiter })
    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('https://pdfhope.com/pdf-reader')
  })
  it('preserves asset 404 responses instead of returning the SPA homepage', async () => {
    const response = await worker.fetch(new Request('https://pdfhope.com/not-a-tool'), { CONVERSION_RATE_LIMITER: limiter, ASSETS: { fetch: async () => new Response('<h1>Not found</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } }) } })
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
  })
  it('prevents Workers preview pages from being indexed', async () => {
    const response = await worker.fetch(new Request('https://preview-pdfhope.example.workers.dev/merge-pdf'), { CONVERSION_RATE_LIMITER: limiter, ASSETS: { fetch: async () => new Response('<h1>Merge PDF</h1>', { headers: { 'Content-Type': 'text/html' } }) } })
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })
  it('keeps API errors separate from HTML fallback', async () => {
    const fetch = vi.fn()
    const response = await worker.fetch(new Request('https://pdfhope.com/api/not-a-route'), { CONVERSION_RATE_LIMITER: limiter, ASSETS: { fetch } })
    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(fetch).not.toHaveBeenCalled()
  })
})
