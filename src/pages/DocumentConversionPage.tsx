import { AlertCircle, ArrowLeft, Check, Download, FileUp, LockKeyhole, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { convertDocument, type ConversionMode, outputName, validateConversionFile } from '../lib/conversion'
import { downloadBlob, formatBytes } from '../lib/files'
import { ToolIcon } from '../components/ToolIcon'
import { useSeo } from '../hooks/useSeo'
import { ToolSeoContent } from '../components/ToolSeoContent'
import { toolSeo } from '../data/toolSeo'

type Status = 'empty' | 'ready' | 'uploading' | 'analyzing' | 'converting' | 'preparing' | 'complete'

const copy = {
  'word-to-pdf': {
    title: 'Word to PDF Converter', description: "Convert Word documents to PDF online while preserving your document's layout and formatting.",
    seoTitle: 'Word to PDF Converter – Convert DOCX to PDF Online | PDFHope', seoDescription: 'Convert Word documents to PDF online with PDFHope. Turn DOC and DOCX files into high-quality PDF documents quickly and securely.',
    accept: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx', select: 'Select Word File', drop: 'or drag & drop your Word document here', action: 'Convert to PDF', download: 'Download PDF', badge: 'WORD',
    steps: ['Ready', 'Uploading', 'Converting Word to PDF', 'Preparing download', 'Complete'],
  },
  'pdf-to-word': {
    title: 'PDF to Word Converter', description: 'Convert PDF files into editable Microsoft Word documents online.',
    seoTitle: 'PDF to Word Converter – Convert PDF to DOCX Online | PDFHope', seoDescription: 'Convert PDF files to editable Word documents online with PDFHope while preserving text, images, tables and document formatting.',
    accept: 'application/pdf,.pdf', select: 'Select PDF File', drop: 'or drag & drop your PDF here', action: 'Convert to Word', download: 'Download Word', badge: 'PDF',
    steps: ['Uploading', 'Analyzing PDF', 'Converting PDF to Word', 'Preparing DOCX', 'Complete'],
  },
} as const

export function DocumentConversionPage({ mode }: { mode: ConversionMode }) {
  return <DocumentConversionWorkspace key={mode} mode={mode}/>
}

function DocumentConversionWorkspace({ mode }: { mode: ConversionMode }) {
  const info = copy[mode]
  const seo = toolSeo[mode]
  useSeo(seo.seoTitle, seo.metaDescription, `/${mode}`, true, true)
  const input = useRef<HTMLInputElement>(null)
  const runId = useRef(0)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('empty')
  const [result, setResult] = useState<Blob | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const busy = ['uploading', 'analyzing', 'converting', 'preparing'].includes(status)

  const reset = () => { runId.current += 1; setFile(null); setStatus('empty'); setResult(null); setError(''); if (input.current) input.current.value = '' }
  const choose = async (next?: File) => {
    if (!next) return
    try { await validateConversionFile(next, mode); runId.current += 1; setFile(next); setStatus('ready'); setResult(null); setError('') }
    catch (cause) { reset(); setError(cause instanceof Error ? cause.message : 'This file could not be opened.') }
  }
  const convert = async () => {
    if (!file || busy) return
    const id = ++runId.current
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 125_000)
    setError(''); setStatus('uploading')
    const analysisTimer = window.setTimeout(() => id === runId.current && setStatus(mode === 'pdf-to-word' ? 'analyzing' : 'converting'), 500)
    const conversionTimer = window.setTimeout(() => id === runId.current && setStatus('converting'), 1_400)
    try {
      const converted = await convertDocument(file, mode, controller.signal)
      if (id !== runId.current) return
      setStatus('preparing'); setResult(converted)
      window.setTimeout(() => id === runId.current && setStatus('complete'), 250)
    } catch (cause) {
      if (id !== runId.current) return
      setStatus('ready'); setError(controller.signal.aborted ? 'Conversion took too long. Please try again.' : cause instanceof Error ? cause.message : 'Conversion failed. Please try again.')
    } finally { clearTimeout(timeout); clearTimeout(analysisTimer); clearTimeout(conversionTimer) }
  }
  const currentStep = status === 'ready' ? 'Ready' : status === 'uploading' ? 'Uploading' : status === 'analyzing' ? 'Analyzing PDF' : status === 'converting' ? (mode === 'word-to-pdf' ? 'Converting Word to PDF' : 'Converting PDF to Word') : status === 'preparing' ? (mode === 'word-to-pdf' ? 'Preparing download' : 'Preparing DOCX') : status === 'complete' ? 'Complete' : ''

  return <main className="tool-page conversion-page"><div className="tool-breadcrumb"><Link to="/tools"><ArrowLeft size={16}/> All tools</Link><span>/</span><span>Convert</span></div>
    <section className="tool-intro"><div><span className="tool-brand-label"><ToolIcon slug={mode} compact/><span className="kicker">Convert</span></span><h1>{info.title}</h1><p>{info.description}</p></div></section>
    {error && <div className="error-panel" role="alert"><AlertCircle size={20}/><div><strong>We couldn’t continue</strong><p>{error}</p></div></div>}
    <section className="workspace-card conversion-workspace"><input ref={input} hidden type="file" accept={info.accept} onChange={(event) => void choose(event.target.files?.[0])}/>
      {!file && <div className={`dropzone conversion-dropzone ${dragging ? 'is-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files[0]) }}>
        <span className="drop-icon"><FileUp size={30}/></span><h2>{info.select}</h2><p>{info.drop}</p><button type="button" className="primary-button" onClick={() => input.current?.click()}>{info.select}</button><span className="provider-note"><LockKeyhole size={15}/> Secure server conversion · 20 MB maximum</span>
      </div>}
      {file && status !== 'complete' && <div className="conversion-ready"><div className="file-queue"><div className="file-card"><span className="pdf-badge">{info.badge}</span><span><strong title={file.name}>{file.name}</strong><small>{formatBytes(file.size)} · {file.type || `.${file.name.split('.').pop()?.toLowerCase()} file`}</small></span><button disabled={busy} onClick={reset} aria-label={`Remove ${file.name}`}><Trash2 size={17}/></button></div></div>
        <div className="configure-panel"><div className="configure-title"><div><span className="step-label">{busy ? 'Conversion in progress' : 'Ready'}</span><h2>{busy ? currentStep : `Ready to ${mode === 'word-to-pdf' ? 'create your PDF' : 'create an editable DOCX'}`}</h2></div>{!busy && <button className="text-button" onClick={() => input.current?.click()}>Change file</button>}</div>
          {busy && <div className="conversion-progress" role="status" aria-live="polite"><span className="conversion-spinner"/><strong>{currentStep}</strong><div><span/></div><small>Please keep this tab open.</small></div>}
          {!busy && <p className="setting-note">{mode === 'pdf-to-word' ? 'Automatic OCR is enabled for scanned pages. The result remains editable where recognition is possible.' : 'DOC and DOCX are converted with a document-aware engine to preserve layout, tables, images, and typography where supported.'}</p>}
          <div className="process-bar"><span><ShieldCheck size={16}/> Encrypted transfer · no PDFHope storage</span><button className="primary-button" disabled={busy} onClick={() => void convert()}>{busy ? currentStep : info.action}</button></div>
        </div></div>}
      {file && status === 'complete' && result && <div className="result-panel"><span className="success-icon"><Check size={30}/></span><span className="kicker">Complete</span><h2>Your {mode === 'word-to-pdf' ? 'PDF' : 'Word document'} is ready</h2><p>Your file was converted in memory and was not permanently stored by PDFHope or the conversion provider.</p><button className="primary-button download-button" onClick={() => downloadBlob(result, outputName(file.name, mode))}><Download size={19}/> {info.download}</button><button className="secondary-button" onClick={reset}><RotateCcw size={17}/> Try another file</button></div>}
    </section>
    <ToolSeoContent slug={mode}/>
  </main>
}
