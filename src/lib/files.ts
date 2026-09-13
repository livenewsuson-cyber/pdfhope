export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 1) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

export const safeBaseName = (name: string) => name.replace(/\.[^/.]+$/, '').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80) || 'document'

export const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export const parsePageSelection = (value: string, pageCount: number) => {
  const picked = new Set<number>()
  const input = value.trim()
  if (!input) return Array.from({ length: pageCount }, (_, index) => index)
  for (const chunk of input.split(',')) {
    const match = chunk.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!match) throw new Error(`Invalid page range: “${chunk.trim()}”`)
    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])
    if (start < 1 || end < start || end > pageCount) throw new Error(`Page range ${chunk.trim()} is outside this ${pageCount}-page document.`)
    for (let page = start; page <= end; page += 1) picked.add(page - 1)
  }
  return [...picked]
}

export const validateFiles = (files: File[], acceptsPdf: boolean, multiple = false) => {
  if (!files.length) throw new Error('Choose at least one file.')
  if (!multiple && files.length > 1) throw new Error('This tool accepts one file at a time.')
  const valid = files.every((file) => acceptsPdf ? file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') : /^image\/(jpeg|png|webp)$/.test(file.type))
  if (!valid) throw new Error(acceptsPdf ? 'Only PDF files are supported here.' : 'Only JPG, PNG, and WebP images are supported here.')
  if (files.some((file) => file.size === 0)) throw new Error('One of the selected files is empty.')
}
