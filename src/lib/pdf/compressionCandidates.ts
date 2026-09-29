export type TextPreservation = 'preserved' | 'partially-preserved' | 'flattened'
export type CompressionMethod = 'structural' | 'high-quality images' | 'scanned-page recompression' | 'page rasterization'
export type CompressionCandidate = {
  bytes: Uint8Array
  methods: CompressionMethod[]
  textPreservation: TextPreservation
  rasterizedPages: number[]
  preservedPages: number[]
  qualityScore?: number
}

export const candidatePageCountMatches = (original: number, candidate: number) => original > 0 && original === candidate

export function chooseCompressionCandidate(originalBytes: number, candidates: CompressionCandidate[], recommended: boolean) {
  const eligible = candidates.filter(candidate =>
    candidate.bytes.length < originalBytes && (!recommended || candidate.textPreservation !== 'flattened'),
  )
  eligible.sort((a, b) => a.bytes.length - b.bytes.length)
  return eligible[0] ?? null
}

export function chooseTargetCompressionCandidate(originalBytes: number, targetBytes: number, candidates: CompressionCandidate[]) {
  const valid = candidates.filter(candidate => candidate.bytes.length < originalBytes)
  const reached = valid.filter(candidate => candidate.bytes.length <= targetBytes)
  reached.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0) || b.bytes.length - a.bytes.length)
  const best = reached[0] ?? valid.sort((a, b) => a.bytes.length - b.bytes.length)[0] ?? null
  return { best, targetReached: reached.length > 0 }
}

export function validateTargetBytes(originalBytes: number, targetBytes: number) {
  if (!Number.isFinite(targetBytes) || targetBytes < 5 * 1024) return 'Enter a target of at least 5 KB.'
  if (targetBytes >= originalBytes) return 'This PDF is already at or below your target size.'
  return null
}
