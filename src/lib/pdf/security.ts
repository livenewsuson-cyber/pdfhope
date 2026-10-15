import { openRenderedPdf } from './render'
import { PermissionFlag } from 'pdfjs-dist'

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
    timeoutMs: 90000,
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

export type PdfSecurityStatus = { needsPassword:boolean; restricted:boolean; permissions:string[]; pages:number; signed:boolean }
export async function inspectSecurity(file:File):Promise<PdfSecurityStatus> {
  if(!file.size||file.size>30*1024*1024)throw new Error('Choose a nonempty PDF no larger than 30 MB.')
  let pdf:Awaited<ReturnType<typeof openRenderedPdf>>
  try{pdf=await openRenderedPdf(file)}catch(error){if(/password/i.test(String(error)))return {needsPassword:true,restricted:false,permissions:[],pages:0,signed:false};throw error}
  try{
    if(pdf.numPages>200)throw new Error('Use at most 200 pages for permission changes.')
    const flags=await pdf.getPermissions(),checks:[number,string][]=[[PermissionFlag.PRINT,'Print'],[PermissionFlag.COPY,'Copy text/images'],[PermissionFlag.MODIFY_CONTENTS,'Edit content'],[PermissionFlag.MODIFY_ANNOTATIONS,'Edit annotations'],[PermissionFlag.ASSEMBLE,'Rearrange pages']]
    const permissions=flags===null?[]:checks.filter(([flag])=>!new Set(flags).has(flag)).map(([,label])=>label)
    const fields=await pdf.getFieldObjects()
    const values=fields instanceof Map?[...fields.values()]:Object.values(fields||{})
    const signed=values.flat().some((v:unknown)=>v&&typeof v==='object'&&(v as {type?:string}).type==='Sig')
    return {needsPassword:false,restricted:permissions.length>0,permissions,pages:pdf.numPages,signed}
  }finally{await pdf.cleanup()}
}

export async function removeOwnerRestrictions(file:File,authorized:boolean):Promise<{output:Blob;pages:number}> {
  if(!authorized)throw new Error('Confirm you own this PDF or are authorized to modify its permissions.')
  const source=await inspectSecurity(file)
  if(source.needsPassword)throw new Error('This PDF requires its opening password. Use the known-password unlock flow.')
  if(!source.restricted)throw new Error('No supported print, copy or edit restrictions were found.')
  return withRunner(async runner=>{
    const bytes=await runner.runOne({input:new Uint8Array(await file.arrayBuffer()),inputName,outputName,args:['--password=','--decrypt',inputName,outputName]})
    const output=pdfFile(bytes),verified=await inspectSecurity(output)
    if(verified.needsPassword||verified.restricted||verified.pages!==source.pages)throw new Error('Permission removal verification failed.')
    const before=await openRenderedPdf(file),after=await openRenderedPdf(output)
    try{
      for(let n=1;n<=source.pages;n++){
        const a=await before.getPage(n),b=await after.getPage(n),av=a.getViewport({scale:1}),bv=b.getViewport({scale:1})
        const text=async(p:typeof a)=>(await p.getTextContent()).items.filter(i=>'str'in i).map(i=>i.str).join('')
        if(av.width!==bv.width||av.height!==bv.height||await text(a)!==await text(b))throw new Error('Document content or page order verification failed.')
        a.cleanup();b.cleanup()
      }
    }finally{await before.cleanup();await after.cleanup()}
    return {output:new Blob([bytes as BlobPart],{type:'application/pdf'}),pages:source.pages}
  })
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
