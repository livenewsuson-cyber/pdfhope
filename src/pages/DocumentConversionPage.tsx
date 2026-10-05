import { AlertCircle, Check, Download, FileUp, LockKeyhole, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { SeoBreadcrumbs } from '../components/SeoBreadcrumbs'
import { convertDocument, type ConversionMode, outputName, validateConversionFile } from '../lib/conversion'
import { downloadBlob, formatBytes } from '../lib/files'
import { ToolIcon } from '../components/ToolIcon'
import { useSeo } from '../hooks/useSeo'
import { ToolSeoContent } from '../components/ToolSeoContent'
import { toolSeo } from '../data/toolSeo'

type Status = 'empty' | 'ready' | 'uploading' | 'analyzing' | 'converting' | 'preparing' | 'complete'

type ConversionCopy = {
  title: string; description: string; accept: string; select: string; drop: string
  action: string; download: string; badge: string; ready: string; note: string; result: string
  steps: { uploading: string; analyzing?: string; converting: string; preparing: string; complete: string }
}

const copy: Record<ConversionMode, ConversionCopy> = {
  'word-to-pdf': {
    title: 'Word to PDF Converter', description: "Convert Word documents to PDF online while preserving your document's layout and formatting.",
    accept: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx', select: 'Select Word File', drop: 'or drag & drop your Word document here', action: 'Convert to PDF', download: 'Download PDF', badge: 'WORD',
    ready: 'create your PDF', note: 'DOC and DOCX are converted with a document-aware engine to preserve layout, tables, images, and typography where supported.', result: 'PDF',
    steps: { uploading: 'Uploading', converting: 'Converting Word to PDF', preparing: 'Preparing PDF', complete: 'Complete' },
  },
  'pdf-to-word': {
    title: 'PDF to Word Converter', description: 'Convert a PDF into an editable Word DOCX. Automatic OCR helps with scanned pages; review the reconstructed layout.',
    accept: 'application/pdf,.pdf', select: 'Select PDF File', drop: 'or drag & drop your PDF here', action: 'Convert to Word', download: 'Download Word', badge: 'PDF',
    ready: 'create an editable DOCX', note: 'Automatic OCR is enabled for scanned pages. The result remains editable where recognition is possible.', result: 'Word document',
    steps: { uploading: 'Uploading', converting: 'Converting PDF to Word', preparing: 'Preparing DOCX', complete: 'Complete' },
  },
  'excel-to-pdf': {
    title: 'Excel to PDF Converter', description: 'Turn XLS and XLSX spreadsheets into PDF with worksheet layout and page settings preserved where supported.',
    accept: 'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,.xlsx', select: 'Select Excel File', drop: 'or drag & drop your spreadsheet here', action: 'Convert to PDF', download: 'Download PDF', badge: 'EXCEL',
    ready: 'create your PDF', note: 'Worksheets, charts, formulas with displayed values, and print settings are converted where supported. Check wide sheets before sharing.', result: 'PDF',
    steps: { uploading: 'Uploading', converting: 'Converting spreadsheet', preparing: 'Preparing PDF', complete: 'Complete' },
  },
  'powerpoint-to-pdf': {
    title: 'PowerPoint to PDF Converter', description: 'Turn PPT and PPTX presentations into static PDFs while preserving slide text, images, and layout where supported.',
    accept: 'application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.ppt,.pptx', select: 'Select PowerPoint File', drop: 'or drag & drop your presentation here', action: 'Convert to PDF', download: 'Download PDF', badge: 'SLIDES',
    ready: 'create your PDF', note: 'Slides become static PDF pages; animations and transitions do not carry over. Speaker notes are not included by default.', result: 'PDF',
    steps: { uploading: 'Uploading', converting: 'Converting presentation', preparing: 'Preparing PDF', complete: 'Complete' },
  },
  'pdf-to-excel': {
    title: 'PDF to Excel Converter', description: 'Convert PDF tables and structured data into an editable Excel workbook.',
    accept: 'application/pdf,.pdf', select: 'Select PDF File', drop: 'or drag & drop your PDF here', action: 'Convert to Excel', download: 'Download Excel', badge: 'PDF',
    ready: 'create an editable Excel workbook', note: 'Clear tables work best. Scanned PDFs may use OCR; review extracted cells and numbers for accuracy.', result: 'Excel workbook',
    steps: { uploading: 'Uploading', analyzing: 'Analyzing tables', converting: 'Converting PDF to Excel', preparing: 'Preparing XLSX', complete: 'Complete' },
  },
  'pdf-to-powerpoint': {
    title: 'PDF to PowerPoint Converter', description: 'Convert PDF pages into PowerPoint slides with editable content where supported.',
    accept: 'application/pdf,.pdf', select: 'Select PDF File', drop: 'or drag & drop your PDF here', action: 'Convert to PowerPoint', download: 'Download PowerPoint', badge: 'PDF',
    ready: 'create your PowerPoint presentation', note: 'The engine reconstructs text and images where possible. Scanned pages may use OCR; review slide layout and editability.', result: 'PowerPoint presentation',
    steps: { uploading: 'Uploading', analyzing: 'Analyzing pages', converting: 'Converting PDF to PowerPoint', preparing: 'Preparing PPTX', complete: 'Complete' },
  },
}

export function DocumentConversionPage({ mode }: { mode: ConversionMode }) {
  return <DocumentConversionWorkspace key={mode} mode={mode}/>
}

function DocumentConversionWorkspace({ mode }: { mode: ConversionMode }) {
  const info = copy[mode]
  const seo = toolSeo[mode]
  useSeo(seo.seoTitle, seo.metaDescription, `/${mode}`, true, true)
  const input = useRef<HTMLInputElement>(null)
  const runId = useRef(0)
  const convertingRef = useRef(false)
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
    if (!file || busy || convertingRef.current) return
    convertingRef.current = true
    const id = ++runId.current
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 125_000)
    setError(''); setStatus('uploading')
    const analysisTimer = window.setTimeout(() => id === runId.current && setStatus(mode.startsWith('pdf-to-') ? 'analyzing' : 'converting'), 500)
    const conversionTimer = window.setTimeout(() => id === runId.current && setStatus('converting'), 1_400)
    try {
      const converted = await convertDocument(file, mode, controller.signal)
      if (id !== runId.current) return
      setStatus('preparing'); setResult(converted)
      window.setTimeout(() => id === runId.current && setStatus('complete'), 250)
    } catch (cause) {
      if (id !== runId.current) return
      setStatus('ready'); setError(controller.signal.aborted ? 'Conversion took too long. Please try again.' : cause instanceof Error ? cause.message : 'Conversion failed. Please try again.')
    } finally { convertingRef.current = false; clearTimeout(timeout); clearTimeout(analysisTimer); clearTimeout(conversionTimer) }
  }
  const currentStep = status === 'ready' ? 'Ready' : status === 'analyzing' ? info.steps.analyzing ?? 'Analyzing PDF' : status === 'empty' ? '' : info.steps[status]

  return <main className="tool-page conversion-page"><SeoBreadcrumbs path={`/${mode}`}/>
    <section className="tool-intro"><div className="tool-intro-copy"><div className="tool-title-row"><ToolIcon slug={mode} compact/><h1>{info.title}</h1></div><p>{info.description}</p></div></section>
    {error && <div className="error-panel" role="alert"><AlertCircle size={20}/><div><strong>We couldn’t continue</strong><p>{error}</p></div></div>}
    <section className={`workspace-card conversion-workspace${!file?' workspace-card--empty':''}`}><input ref={input} hidden type="file" accept={info.accept} onChange={(event) => void choose(event.target.files?.[0])}/>
      {!file && <div className={`dropzone conversion-dropzone ${dragging ? 'is-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files[0]) }}>
        <span className="drop-icon"><FileUp size={30}/></span><h2>{info.select}</h2><p>{info.drop}</p><button type="button" className="primary-button" onClick={() => input.current?.click()}>{info.select}</button><span className="provider-note"><LockKeyhole size={15}/> Secure server conversion · 20 MB maximum · No PDFHope storage</span>
      </div>}
      {file && status !== 'complete' && <div className="conversion-ready"><div className="file-queue"><div className="file-card"><span className="pdf-badge">{info.badge}</span><span><strong title={file.name}>{file.name}</strong><small>{formatBytes(file.size)} · {file.type || `.${file.name.split('.').pop()?.toLowerCase()} file`}</small></span><button disabled={busy} onClick={reset} aria-label={`Remove ${file.name}`}><Trash2 size={17}/></button></div></div>
        <div className="configure-panel"><div className="configure-title"><div><span className="step-label">{busy ? 'Conversion in progress' : 'Ready'}</span><h2>{busy ? currentStep : `Ready to ${info.ready}`}</h2></div>{!busy && <button className="text-button" onClick={() => input.current?.click()}>Change file</button>}</div>
          {busy && <div className="conversion-progress" role="status" aria-live="polite"><span className="conversion-spinner"/><strong>{currentStep}</strong><div><span/></div><small>Please keep this tab open.</small></div>}
          {!busy && <p className="setting-note">{info.note}</p>}
          <div className="process-bar"><span><ShieldCheck size={16}/> Secure conversion · no signup · no PDFHope watermark</span><button className="primary-button" disabled={busy} onClick={() => void convert()}>{busy ? currentStep : info.action}</button></div>
        </div></div>}
      {file && status === 'complete' && result && <div className="result-panel"><span className="success-icon"><Check size={30}/></span><span className="kicker">Complete</span><h2>Your {info.result} is ready</h2><p>The file was processed in the provider's zero-storage mode. PDFHope does not store your document or add a branding watermark.</p><button className="primary-button download-button" onClick={() => downloadBlob(result, outputName(file.name, mode))}><Download size={19}/> {info.download}</button><button className="secondary-button" onClick={reset}><RotateCcw size={17}/> Try another file</button></div>}
    </section>
    <ToolSeoContent slug={mode}/>
  </main>
}
