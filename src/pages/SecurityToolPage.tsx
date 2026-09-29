import { useState } from 'react'
import { SeoBreadcrumbs } from '../components/SeoBreadcrumbs'
import { Check, Download, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { FileDropzone } from '../components/FileDropzone'
import { ToolSeoContent } from '../components/ToolSeoContent'
import { ToolIcon } from '../components/ToolIcon'
import { getTool } from '../data/tools'
import { toolSeo } from '../data/toolSeo'
import { toolH1 } from '../data/toolHeadings'
import { downloadBlob, safeBaseName, validateFiles } from '../lib/files'
import { isPasswordProtected, passwordStrength, protectPdf, securityError, unlockPdf, validateProtectionPassword } from '../lib/pdf/security'
import { useSeo } from '../hooks/useSeo'

export function SecurityToolPage({ mode }: { mode: 'protect-pdf' | 'unlock-pdf' }) {
  const slug = mode
  const tool = getTool(slug)!
  const protecting = slug === 'protect-pdf'
  const seo = toolSeo[slug]
  useSeo(seo.seoTitle, seo.metaDescription, `/${slug}`, true, true)
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Blob | null>(null)
  const [pages, setPages] = useState(0)
  const reset = () => { setFile(null); setPassword(''); setConfirm(''); setError(''); setResult(null); setPages(0); setVisible(false) }
  const accept = async (files: File[]) => {
    reset()
    try {
      validateFiles(files, true)
      const next = files[0]
      if (!protecting && !(await isPasswordProtected(next))) throw new Error('This PDF does not appear to need an opening password.')
      setFile(next)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open this file.') }
  }
  const validation = protecting && password ? validateProtectionPassword(password, confirm) : ''
  const canProcess = !!file && !busy && (protecting ? !validation && !!password : !!password)
  const process = async () => {
    if (!file || !canProcess) return
    setBusy(true); setError('')
    try {
      const done = protecting ? await protectPdf(file, password) : await unlockPdf(file, password)
      setResult(done.output); setPages(done.pages)
      setPassword(''); setConfirm('')
    } catch (cause) { setError(cause instanceof Error && /does not appear to need/i.test(cause.message) ? cause.message : securityError(cause, protecting ? 'protect' : 'unlock')) }
    finally { setBusy(false) }
  }
  const filename = `${safeBaseName(file?.name || 'document')}-${protecting ? 'protected' : 'unlocked'}.pdf`
  return <main className="tool-page security-page"><SeoBreadcrumbs path={`/${slug}`}/>
    <section className="tool-intro"><div className="tool-intro-copy"><div className="tool-title-row"><ToolIcon slug={slug} compact/><h1>{toolH1(slug, tool.name)}</h1></div><p>{tool.description}</p></div></section>
    {error && <div className="error-panel" role="alert"><div><strong>We couldn’t continue</strong><p>{error}</p></div></div>}
    <section className="workspace-card">
      {!file && <FileDropzone accept={tool.accepts} onFiles={(files) => { void accept(files) }}/>}
      {file && !result && <div className="configure-panel"><div className="configure-title"><div><span className="step-label">Step 2</span><h2>{protecting ? 'Set an opening password' : 'Enter the document password'}</h2><p>{file.name}</p></div><button className="text-button" onClick={reset} disabled={busy}>Clear all</button></div>
        <div className="security-fields"><label className="field" htmlFor="pdf-password"><span>Password</span><span className="security-password-row"><input id="pdf-password" type={visible ? 'text' : 'password'} autoComplete={protecting ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby={protecting ? 'password-guidance' : undefined} aria-invalid={!!validation}/><button type="button" className="security-visibility" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></span></label>
        {protecting && <><label className="field" htmlFor="pdf-confirm"><span>Confirm password</span><input id="pdf-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} aria-describedby="password-guidance" aria-invalid={!!validation && !!confirm}/></label><p id="password-guidance" className="setting-note" role="status">{validation || `Strength: ${passwordStrength(password)}. Use 12+ characters with a mix of letters, numbers, and symbols.`}</p></>}</div>
        <p className="security-notice">{protecting ? 'Creating an encrypted copy may invalidate existing digital signatures. Keep your password safely; PDFHope cannot recover it.' : 'Use this tool only for PDFs you are authorized to unlock. Unknown passwords cannot be recovered or bypassed.'}</p><p className="setting-note">Passwords are used only during local processing in this browser tab.</p>
        <div className="process-bar"><span>Processed locally</span><button className="primary-button" onClick={() => { void process() }} disabled={!canProcess}>{busy ? 'Processing…' : protecting ? 'Protect PDF' : 'Unlock PDF'}</button></div></div>}
      {result && <div className="result-panel"><span className="success-icon"><Check size={30}/></span><span className="kicker">Complete</span><h2>{protecting ? 'Protected PDF ready' : 'Unlocked PDF ready'}</h2><p>{protecting ? 'Keep your password safely. PDFHope cannot recover it.' : 'Password protection removed.'}</p><div className="compression-metrics"><div><span>{protecting ? 'Encryption' : 'Protection'}</span><strong>{protecting ? 'AES-256' : 'Removed'}</strong></div><div><span>Processing</span><strong>Local</strong></div><div><span>Pages</span><strong>{pages}</strong></div></div><button className="primary-button download-button" onClick={() => downloadBlob(result, filename)}><Download size={19}/> Download {protecting ? 'protected' : 'unlocked'} PDF</button><button className="secondary-button" onClick={reset}><RotateCcw size={17}/> Start over</button></div>}
    </section><ToolSeoContent slug={slug}/>
  </main>
}
