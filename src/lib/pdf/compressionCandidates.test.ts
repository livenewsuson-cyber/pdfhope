import { describe, expect, it } from 'vitest'
import { candidatePageCountMatches, chooseCompressionCandidate, chooseTargetCompressionCandidate, validateTargetBytes, type CompressionCandidate } from './compressionCandidates'

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
  it('chooses the highest-quality valid candidate under a target', () => {
    const high = { ...candidate(198_000, 'page rasterization', 'flattened'), qualityScore: 80 }
    const low = { ...candidate(122_000, 'page rasterization', 'flattened'), qualityScore: 40 }
    const choice = chooseTargetCompressionCandidate(1_200_000, 200_000, [low, high])
    expect(choice.best).toBe(high)
    expect(choice.targetReached).toBe(true)
  })
  it('returns the smallest valid result when the target is impossible', () => {
    const choice = chooseTargetCompressionCandidate(500_000, 100_000, [candidate(146_000, 'structural'), candidate(175_000, 'page rasterization', 'flattened')])
    expect(choice.best?.bytes.length).toBe(146_000)
    expect(choice.targetReached).toBe(false)
  })
  it('does not present enlarged output as compression', () => {
    expect(chooseTargetCompressionCandidate(125_000, 50_000, [candidate(126_000, 'structural')]).best).toBeNull()
    expect(validateTargetBytes(125_000, 125_000)).toContain('already at or below')
    expect(validateTargetBytes(125_000, 5_000)).toContain('at least 5 KB')
    expect(validateTargetBytes(125_000, 50_000)).toBeNull()
  })
})
