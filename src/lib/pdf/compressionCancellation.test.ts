import { describe, expect, it, vi } from 'vitest'
// Fault injection for the transport hang observed in a real browser.
vi.mock('./render',()=>({openRenderedPdf:()=>new Promise(()=>{}),closeRenderedPdf:vi.fn()}))
import { compressPdf } from './compress'
describe('compression cancellation during stalled PDF transport',()=>{
  it('rejects immediately even when the parser never settles',async()=>{
    const controller=new AbortController()
    const pending=compressPdf(new File(['%PDF-1.7'],'stalled.pdf'),{preset:'recommended',signal:controller.signal})
    controller.abort()
    await expect(pending).rejects.toMatchObject({name:'AbortError'})
  })
})
