export type TextPreservation = 'preserved' | 'partially-preserved' | 'flattened'
export type CompressionMethod = 'structural' | 'high-quality images' | 'scanned-page recompression' | 'page rasterization'
export type CompressionCandidate = {
  bytes: Uint8Array
  methods: CompressionMethod[]
  textPreservation: TextPreservation
  rasterizedPages: number[]
  preservedPages: number[]
}

export const candidatePageCountMatches = (original: number, candidate: number) => original > 0 && original === candidate

export function chooseCompressionCandidate(originalBytes: number, candidates: CompressionCandidate[], recommended: boolean) {
  const eligible = candidates.filter(candidate =>
    candidate.bytes.length < originalBytes && (!recommended || candidate.textPreservation !== 'flattened'),
  )
  eligible.sort((a, b) => a.bytes.length - b.bytes.length)
  return eligible[0] ?? null
}
