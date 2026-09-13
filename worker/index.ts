const MAX_FILE_BYTES = 20 * 1024 * 1024
const PROVIDER_TIMEOUT_MS = 120_000

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

interface Env {
  CONVERTAPI_TOKEN?: string
  CONVERSION_RATE_LIMITER: RateLimitBinding
}

type Mode = 'word-to-pdf' | 'pdf-to-word'

const routes: Record<string, Mode> = {
  '/api/convert/word-to-pdf': 'word-to-pdf',
  '/api/convert/pdf-to-word': 'pdf-to-word',
}

const jsonError = (status: number, code: string, requestId: string) => Response.json(
  { error: 'Conversion could not be completed.', code, requestId },
  { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
)

const safeFilename = (encoded: string | null) => {
  let decoded = ''
  try { decoded = decodeURIComponent(encoded ?? '') } catch { decoded = '' }
  return decoded.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._ -]/g, '-').replace(/\s+/g, '-').replace(/^-+/, '').slice(0, 100) || 'document'
}

const extensionOf = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value)

export function validMagic(bytes: Uint8Array, extension: string) {
  if (extension === 'pdf') return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
  if (extension === 'doc') return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  if (extension === 'docx') return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
  return false
}

async function inspectStream(stream: ReadableStream<Uint8Array>, required = 8) {
  const [inspection, passthrough] = stream.tee()
  const reader = inspection.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (length < required) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value); length += value.byteLength
  }
  void reader.cancel()
  const prefix = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { prefix.set(chunk, offset); offset += chunk.byteLength }
  return { prefix, stream: passthrough }
}

function providerCode(status: number, body: string, mode: Mode) {
  let code = 0
  try { code = Number((JSON.parse(body) as { Code?: unknown }).Code ?? 0) } catch { /* status mapping below */ }
  if (code === 5003 || /password protected/i.test(body)) return 'password_protected'
  if (code === 5002 || status === 415) return 'invalid_file'
  if (code === 5000) return 'timeout'
  if (status === 403) return 'quota_exhausted'
  if (status === 429 || status === 503) return 'provider_unavailable'
  if (mode === 'pdf-to-word' && /ocr/i.test(body)) return 'ocr_failed'
  return status >= 500 ? 'provider_unavailable' : 'invalid_file'
}

async function handleConversion(request: Request, env: Env, mode: Mode, requestId: string) {
  if (request.method !== 'POST') return jsonError(405, 'method_not_allowed', requestId)
  const requestUrl = new URL(request.url)
  const origin = request.headers.get('Origin')
  if (origin && origin !== requestUrl.origin) return jsonError(403, 'invalid_origin', requestId)
  const size = Number(request.headers.get('Content-Length'))
  if (!Number.isFinite(size) || size <= 0) return jsonError(400, 'invalid_file', requestId)
  if (size > MAX_FILE_BYTES) return jsonError(413, 'too_large', requestId)
  if (!request.body) return jsonError(400, 'invalid_file', requestId)

  const filename = safeFilename(request.headers.get('X-PDFHope-Filename'))
  const extension = extensionOf(filename)
  if ((mode === 'pdf-to-word' && extension !== 'pdf') || (mode === 'word-to-pdf' && !['doc', 'docx'].includes(extension))) return jsonError(415, 'invalid_file', requestId)

  const contentType = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() ?? ''
  const allowedTypes = mode === 'pdf-to-word'
    ? ['application/pdf', 'application/octet-stream']
    : ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']
  if (!allowedTypes.includes(contentType)) return jsonError(415, 'invalid_file', requestId)

  const inspected = await inspectStream(request.body)
  if (!validMagic(inspected.prefix, extension)) {
    await inspected.stream.cancel()
    return jsonError(415, 'invalid_file', requestId)
  }

  const rateKey = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const rate = await env.CONVERSION_RATE_LIMITER.limit({ key: `${mode}:${rateKey}` })
  if (!rate.success) {
    await inspected.stream.cancel()
    return jsonError(429, 'rate_limited', requestId)
  }
  if (!env.CONVERTAPI_TOKEN) {
    await inspected.stream.cancel()
    return jsonError(503, 'service_not_configured', requestId)
  }

  const source = extension
  const target = mode === 'word-to-pdf' ? 'pdf' : 'docx'
  const providerUrl = new URL(`https://v2.convertapi.com/convert/${source}/to/${target}`)
  providerUrl.searchParams.set('StoreFile', 'false')
  if (mode === 'pdf-to-word') {
    providerUrl.searchParams.set('Layout', 'flowing')
    providerUrl.searchParams.set('OcrMode', 'auto')
    providerUrl.searchParams.set('OcrLanguage', 'auto')
    providerUrl.searchParams.set('OcrEngine', 'native')
  }

  let providerResponse: Response
  try {
    providerResponse = await fetch(providerUrl, {
      method: 'POST', body: inspected.stream,
      headers: {
        Authorization: `Bearer ${env.CONVERTAPI_TOKEN}`,
        Accept: 'application/octet-stream',
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })
  } catch (cause) {
    return jsonError(503, cause instanceof DOMException && cause.name === 'TimeoutError' ? 'timeout' : 'provider_unavailable', requestId)
  }

  if (!providerResponse.ok) {
    const body = (await providerResponse.text()).slice(0, 2_000)
    const code = providerCode(providerResponse.status, body, mode)
    return jsonError(code === 'quota_exhausted' ? 503 : code === 'timeout' ? 504 : 422, code, requestId)
  }
  if (!providerResponse.body) return jsonError(502, 'provider_unavailable', requestId)
  const result = await inspectStream(providerResponse.body)
  if (!validMagic(result.prefix, target)) {
    await result.stream.cancel()
    return jsonError(502, mode === 'pdf-to-word' ? 'ocr_failed' : 'provider_unavailable', requestId)
  }
  const base = filename.replace(/\.[^.]+$/, '') || 'document'
  const output = `${base}.${target}`
  return new Response(result.stream, { headers: {
    'Content-Type': target === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${output}"`,
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'X-PDFHope-Request-Id': requestId,
  } })
}

export default {
  async fetch(request: Request, env: Env) {
    const requestId = crypto.randomUUID()
    const mode = routes[new URL(request.url).pathname]
    if (!mode) return jsonError(404, 'not_found', requestId)
    try { return await handleConversion(request, env, mode, requestId) }
    catch { return jsonError(500, 'provider_unavailable', requestId) }
  },
}
