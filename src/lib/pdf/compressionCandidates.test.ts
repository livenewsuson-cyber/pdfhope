import { describe, expect, it } from 'vitest'
import { candidatePageCountMatches, chooseCompressionCandidate, type CompressionCandidate } from './compressionCandidates'

const candidate = (size: number, method: CompressionCandidate['methods'][number], text: CompressionCandidate['textPreservation'] = 'preserved'): CompressionCandidate => ({
  bytes: new Uint8Array(size), methods: [method], textPreservation: text, rasterizedPages: [], preservedPages: [1],
})

describe('preservation-first compression candidates', () => {
  it('keeps a smaller structural candidate, including for tiny PDFs', () => {
    expect(chooseCompressionCandidate(125_000, [candidate(92_000, 'structural')], true)?.bytes.length).toBe(92_000)
    expect(chooseCompressionCandidate(50, [candidate(46, 'structural')], true)?.bytes.length).toBe(46)
  })
  it('rejects enlarged structural and image candidates', () => {
    expect(chooseCompressionCandidate(100, [candidate(101, 'structural'), candidate(102, 'high-quality images')], true)).toBeNull()
  })
  it('chooses a smaller valid image candidate over a structural candidate', () => {
    const best = chooseCompressionCandidate(1000, [candidate(850, 'structural'), candidate(700, 'high-quality images')], true)
    expect(best?.methods).toEqual(['high-quality images'])
    expect(best?.textPreservation).toBe('preserved')
  })
  it('rejects a smaller raster candidate if it flattens text in Recommended', () => {
    const best = chooseCompressionCandidate(1000, [candidate(800, 'structural'), candidate(300, 'page rasterization', 'flattened')], true)
    expect(best?.bytes.length).toBe(800)
    expect(chooseCompressionCandidate(1000, [candidate(300, 'page rasterization', 'flattened')], true)).toBeNull()
  })
  it('allows aggressive flattening only when explicitly selected', () => {
    expect(chooseCompressionCandidate(1000, [candidate(300, 'page rasterization', 'flattened')], false)?.textPreservation).toBe('flattened')
  })
  it('rejects mismatched or empty page counts', () => {
    expect(candidatePageCountMatches(20, 20)).toBe(true)
    expect(candidatePageCountMatches(20, 19)).toBe(false)
    expect(candidatePageCountMatches(0, 0)).toBe(false)
  })
})
