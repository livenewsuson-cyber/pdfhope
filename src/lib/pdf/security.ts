import { openRenderedPdf } from './render'

const inputName = 'input.pdf'
const outputName = 'output.pdf'

export function passwordStrength(password: string): 'Weak' | 'Okay' | 'Strong' {
  if (password.length < 8) return 'Weak'
  const varied = /[a-z]/i.test(password) && /\d/.test(password) && /[^\p{L}\p{N}]/u.test(password)
  return password.length >= 12 && varied ? 'Strong' : 'Okay'
}

export function validateProtectionPassword(password: string, confirmation: string): string {
  if (password.length < 8) return 'Use at least 8 characters (12 or more recommended).'
  if (password !== confirmation) return 'Passwords do not match.'
  return ''
}

export function randomOwnerPassword(random = crypto.getRandomValues(new Uint8Array(32))): string {
  return Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function securityError(error: unknown, operation: 'protect' | 'unlock'): string {
  const detail = error instanceof Error ? error.message : ''
  const qpdf = error as { code?: string; exitCode?: number; stderr?: string[] } | null
  const stderr = Array.isArray(qpdf?.stderr) ? qpdf.stderr.join(' ') : ''
  if (/memory|allocation|out of bounds/i.test(detail)) return 'This PDF exceeded available browser memory. Try a smaller file or close other tabs.'
  if (operation === 'unlock' && (/password|encrypted|status [123]|exit\([123]\)|invalid password/i.test(`${detail} ${stderr}`) || qpdf?.code === 'QPDF_OUTPUT_MISSING' || (qpdf?.code === 'QPDF_EXEC_FAILED' && qpdf.exitCode == null && /^\d+$/.test(detail)))) return 'That password could not open this PDF.'
  if (/damaged|invalid|parse|xref|header/i.test(detail)) return 'This PDF appears damaged or unsupported.'
  return operation === 'protect' ? 'Unable to create a protected PDF in this browser.' : 'Unable to unlock this PDF in this browser.'
}

async function withRunner<T>(work: (runner: Awaited<ReturnType<typeof import('../../vendor/qpdf-run/src/index.js')['createQpdfRunner']>>) => Promise<T>): Promise<T> {
  const { createQpdfRunner } = await import('../../vendor/qpdf-run/src/index.js')
  const runner = await createQpdfRunner({
    workerUrl: new URL('../../vendor/qpdf-run/src/worker.js', import.meta.url),
    qpdfJsUrl: new URL('../../vendor/qpdf-run/vendor/qpdf/lib/qpdf.js', import.meta.url),
    wasmUrl: new URL('../../vendor/qpdf-run/vendor/qpdf/lib/qpdf.wasm', import.meta.url),
    timeoutMs: 10 * 60 * 1000,
  })
  try { return await work(runner) } finally { await runner.destroy() }
}

function pdfFile(bytes: Uint8Array): File { return new File([bytes as BlobPart], 'verification.pdf', { type: 'application/pdf' }) }

async function pageCount(file: File): Promise<number> {
  const document = await openRenderedPdf(file)
  try { return document.numPages } finally { await document.cleanup() }
}

export async function isPasswordProtected(file: File): Promise<boolean> {
  try { await pageCount(file); return false } catch (error) {
    if (/password/i.test(String(error))) return true
    throw error
  }
}

export async function protectPdf(file: File, password: string): Promise<{ output: Blob; pages: number }> {
  if (password.length < 8) throw new Error('Password must have at least 8 characters.')
  const pages = await pageCount(file)
  const owner = randomOwnerPassword()
  return withRunner(async (runner) => {
    // qpdf 11.10 supports the named-argument form; argv entries are never shell-interpolated.
    const locked = await runner.runOne({ input: new Uint8Array(await file.arrayBuffer()), inputName, outputName,
      args: ['--encrypt', `--user-password=${password}`, `--owner-password=${owner}`, '--bits=256', '--', inputName, outputName] })
    if (!locked.length || !(await isPasswordProtected(pdfFile(locked)))) throw new Error('Encryption validation failed')
    const reopened = await runner.runOne({ input: new Uint8Array(locked), inputName, outputName,
      args: [`--password=${password}`, '--decrypt', inputName, outputName] })
    if (await pageCount(pdfFile(reopened)) !== pages) throw new Error('Page validation failed')
    return { output: new Blob([locked as BlobPart], { type: 'application/pdf' }), pages }
  })
}

export async function unlockPdf(file: File, password: string): Promise<{ output: Blob; pages: number }> {
  if (!password) throw new Error('Password required')
  if (!(await isPasswordProtected(file))) throw new Error('This PDF does not appear to need an opening password.')
  return withRunner(async (runner) => {
    const unlocked = await runner.runOne({ input: new Uint8Array(await file.arrayBuffer()), inputName, outputName,
      args: [`--password=${password}`, '--decrypt', inputName, outputName] })
    const pages = await pageCount(pdfFile(unlocked))
    if (!pages || await isPasswordProtected(pdfFile(unlocked))) throw new Error('Output validation failed')
    return { output: new Blob([unlocked as BlobPart], { type: 'application/pdf' }), pages }
  })
}
