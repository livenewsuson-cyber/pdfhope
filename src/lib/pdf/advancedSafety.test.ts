import { describe, expect, it } from 'vitest'
import { targetProfiles, compressPdf } from './compress'
import { chooseTargetCompressionCandidate } from './compressionCandidates'

describe('advanced PDF safety boundaries',()=>{
  it('uses bounded quality profiles and never selects a larger successful result',()=>{
    for(const preference of ['maximum','balanced','best'] as const){const profiles=targetProfiles(preference);expect(profiles.length).toBeLessThanOrEqual(3);expect(profiles.every(p=>p.dpi>=105&&p.quality>=.56)).toBe(true)}
    expect(targetProfiles('best').every(p=>p.dpi>=160&&p.quality>=.84)).toBe(true)
    expect(chooseTargetCompressionCandidate(100,50,[{bytes:new Uint8Array(120),methods:['structural'],textPreservation:'preserved',rasterizedPages:[],preservedPages:[1]}]).best).toBeNull()
  })
  it('enforces pre-cancellation and input limits before starting engines',async()=>{
    const controller=new AbortController();controller.abort()
    await expect(compressPdf(new File(['%PDF-1.7'],'sample.pdf'),{preset:'target',targetBytes:5120,signal:controller.signal})).rejects.toThrow()
    await expect(compressPdf(new File([new Uint8Array(31*1024*1024)],'large.pdf'),{preset:'recommended'})).rejects.toThrow('30 MB')
  })
})
