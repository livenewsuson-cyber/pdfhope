import { AlertCircle, ArrowLeft, Check, Download, FileText, FileUp, LockKeyhole, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { convertDocument, type ConversionMode, outputName, validateConversionFile } from '../lib/conversion'
import { downloadBlob, formatBytes } from '../lib/files'
import { ToolIcon } from '../components/ToolIcon'
import { useSeo } from '../hooks/useSeo'

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
  useSeo(info.seoTitle, info.seoDescription, `/${mode}`, true, true)
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
    <ConversionContent mode={mode}/><section className="related"><h2>Related conversion tools</h2><div><Link to={mode === 'word-to-pdf' ? '/pdf-to-word' : '/word-to-pdf'}><FileText size={20}/><span><strong>{mode === 'word-to-pdf' ? 'PDF to Word' : 'Word to PDF'}</strong><small>Convert in the other direction</small></span></Link><Link to="/pdf-to-jpg"><FileText size={20}/><span><strong>PDF to JPG</strong><small>Render PDF pages as images</small></span></Link><Link to="/images-to-pdf"><FileText size={20}/><span><strong>Images to PDF</strong><small>Combine images into a PDF</small></span></Link></div></section>
  </main>
}

function ConversionContent({ mode }: { mode: ConversionMode }) {
  if (mode === 'word-to-pdf') return <><section className="tool-copy"><article><span className="kicker">How it works</span><h2>How to Convert Word to PDF</h2><ol><li><span>1</span><p>Select a DOC or DOCX file up to 20 MB.</p></li><li><span>2</span><p>Choose Convert to PDF and keep the tab open while the document is processed.</p></li><li><span>3</span><p>Download the PDF and review it before sharing.</p></li></ol></article><aside><ShieldCheck size={24}/><h3>Secure Online Conversion</h3><p>Your document is encrypted in transit and processed in memory. PDFHope does not permanently store uploads or results.</p><h3>High-Quality Word Conversion</h3><p>The conversion engine is designed to retain fonts, styles, tables, images, links, headers, footers, page breaks, margins, and orientation where the source permits.</p></aside></section><section className="faq"><span className="kicker">Why PDF?</span><h2>Why Convert Word Documents to PDF?</h2><p>PDF keeps a stable page appearance across devices and makes a finished document easier to print or share without accidental edits.</p><h2>Word to PDF FAQ</h2><details><summary>Are DOC and DOCX supported?</summary><p>Yes. Both modern DOCX and legacy DOC documents are accepted.</p></details><details><summary>Will every font look identical?</summary><p>Embedded and commonly available fonts generally convert accurately. A missing or restricted font may be substituted, so review the result before publishing.</p></details><details><summary>Are files stored?</summary><p>No. PDFHope streams the file through its Cloudflare Worker to the conversion provider in zero-storage mode, and streams the result back.</p></details></section></>
  return <><section className="tool-copy"><article><span className="kicker">How it works</span><h2>How to Convert PDF to Word</h2><ol><li><span>1</span><p>Select a PDF file up to 20 MB.</p></li><li><span>2</span><p>Choose Convert to Word. Automatic OCR is applied when scanned pages are detected.</p></li><li><span>3</span><p>Download the DOCX, open it in Word, and review the editable content.</p></li></ol></article><aside><FileText size={24}/><h3>Create Editable Word Documents</h3><p>A layout-aware conversion engine reconstructs paragraphs, headings, tables, images, lists, columns, links, and page structure instead of merely extracting plain text.</p><h3>PDF to DOCX Conversion</h3><p>The default flowing layout favors useful editing while preserving the source structure as accurately as possible.</p></aside></section><section className="faq"><span className="kicker">Recognition</span><h2>Scanned PDF and OCR</h2><p>Automatic OCR detects image-only pages and recognizes editable text where possible. Results depend on scan clarity, language detection, rotation, and handwriting.</p><h2>PDF to Word FAQ</h2><details><summary>Will the DOCX be editable?</summary><p>Yes. Text is reconstructed as editable Word content. Complex areas may use tables, sections, or text boxes to preserve layout.</p></details><details><summary>What happens with a password-protected PDF?</summary><p>Remove the password with permission before uploading. PDFHope does not ask for or retain PDF passwords.</p></details><details><summary>Can OCR recognize every scan?</summary><p>No. Low resolution, skew, handwriting, unusual scripts, and damaged scans can reduce accuracy. PDFHope reports a failure instead of returning an empty document when the provider cannot convert the file.</p></details></section></>
}
