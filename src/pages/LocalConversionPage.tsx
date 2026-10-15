import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { FileDropzone } from '../components/FileDropzone'
import { SeoBreadcrumbs } from '../components/SeoBreadcrumbs'
import { ToolSeoContent } from '../components/ToolSeoContent'
import { ToolIcon } from '../components/ToolIcon'
import { getTool } from '../data/tools'
import { toolSeo } from '../data/toolSeo'
import { useSeo } from '../hooks/useSeo'
import { downloadBlob, formatBytes, safeBaseName } from '../lib/files'
import '../styles/local-conversion.css'

export function LocalConversionPage() {
  const { slug = 'pdf-to-txt' } = useParams()
  const tool = getTool(slug)!, seo = toolSeo[slug]
  useSeo(seo.seoTitle, seo.metaDescription, `/${slug}`, true, true)
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState('')
  const [result, setResult] = useState<{ blob: Blob; warnings: string[]; pages: number } | null>(null)
  const worker = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stop = () => { worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null }
  useEffect(() => () => { worker.current?.terminate(); if (timer.current) clearTimeout(timer.current) }, [])
  const cancel = () => { stop(); setBusy(false); setProgress('Cancelled. Your original file is unchanged.') }
  const accept = (files: File[]) => {
    stop(); setBusy(false); setResult(null); setError(''); setProgress('')
    const next = files[0]
    if (files.length !== 1 || !next?.size || next.size > 20 * 1024 * 1024 || !next.name.toLowerCase().endsWith(tool.accepts.split(',').at(-1)!)) { setFile(null); setError(`Choose one ${tool.accepts.split(',').at(-1)} file, up to 20 MB.`); return }
    setFile(next)
  }
  const process = () => {
    if (!file) return
    setBusy(true); setError(''); setResult(null); setProgress('Opening file locally…')
    const job = new Worker(new URL('../lib/converters/conversion.worker.ts', import.meta.url), { type: 'module' }); worker.current = job
    const fail = (message: string) => { stop(); setBusy(false); setError(message) }
    timer.current = setTimeout(() => fail('Processing exceeded 60 seconds. Try a smaller file.'), 60000)
    job.onerror = () => fail('The local converter could not run. Try a smaller file or a current browser.')
    job.onmessage = (event: MessageEvent<{ progress?: string; error?: string; result?: Blob; pages: number; warnings: string[] }>) => {
      if (event.data.progress) setProgress(event.data.progress)
      else if (event.data.error) fail(event.data.error)
      else if (event.data.result) { setResult({ blob:event.data.result, pages:event.data.pages, warnings:event.data.warnings }); stop(); setBusy(false); setProgress('') }
    }
    job.postMessage({ mode:slug, file })
  }
  return <main className="tool-page local-conversion"><SeoBreadcrumbs path={`/${slug}`} /><section className="tool-intro"><div className="tool-intro-copy"><div className="tool-title-row"><ToolIcon slug={slug} compact /><h1>{tool.name}</h1></div><p>{tool.description}</p></div></section>
    {error && <div className="error-panel" role="alert"><p>{error}</p></div>}
    <section className="workspace-card">
      {!file && <FileDropzone accept={tool.accepts} onFiles={accept} />}
      {file && <div className="configure-panel"><div className="configure-title"><div><h2>{file.name}</h2><p>{formatBytes(file.size)} · Processed on your device</p></div><button className="text-button" disabled={busy} onClick={() => { setFile(null); setResult(null); setError('') }}>Choose another file</button></div>
        {!result && <><p>Text extraction follows the PDF text layer. Columns and complex reading order need review. Scanned pages require OCR.</p><div className="process-bar"><span role="status">{progress || 'Your file stays in this browser tab.'}</span>{busy ? <button className="secondary-button" onClick={cancel}>Cancel</button> : <button className="primary-button" onClick={process}>Extract text</button>}</div></>}
        {result && <div className="local-result"><h2>Text download ready</h2><p>{result.pages} source pages · {formatBytes(result.blob.size)}</p>{result.warnings.map(w => <p className="compression-warning" key={w}>{w}</p>)}<button className="primary-button" onClick={() => downloadBlob(result.blob, `${safeBaseName(file.name)}.txt`)}><Download size={18} /> Download TXT</button></div>}
        <p className="setting-note">For image-only pages, <Link to="/ocr-pdf">make the PDF searchable with local OCR</Link>, then extract its text. Original PDF formatting is not retained in TXT.</p>
      </div>}
    </section><ToolSeoContent slug={slug} /></main>
}
