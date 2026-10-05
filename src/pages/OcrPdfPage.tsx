import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Download, RotateCcw } from 'lucide-react'
import { FileDropzone } from '../components/FileDropzone'
import { ToolIcon } from '../components/ToolIcon'
import { ToolSeoContent } from '../components/ToolSeoContent'
import { SeoBreadcrumbs } from '../components/SeoBreadcrumbs'
import { getTool } from '../data/tools'
import { toolSeo } from '../data/toolSeo'
import { downloadBlob, formatBytes, safeBaseName, validateFiles } from '../lib/files'
import { analyzeOcrFile, runOcrPdf, type OcrAnalysis, type OcrResult, type OcrStage } from '../lib/ocr/engine'
import { selectOcrPages, type OcrMode, type OcrQuality } from '../lib/ocr/planning'
import { useSeo } from '../hooks/useSeo'

const slug = 'ocr-pdf'
const tool = getTool(slug)!
const seo = toolSeo[slug]

function friendlyError(cause: unknown) {
  if (cause instanceof Error) {
    if (cause.name === 'PasswordException' || /password|encrypted/i.test(cause.message)) return 'This PDF is password-protected. Unlock it first.'
    if (/fetch|network|language|traineddata|load tesseract|worker script/i.test(cause.message)) return 'OCR language data could not be loaded. Check your connection and try again.'
    if (/memory|allocation|canvas/i.test(cause.message)) return 'The browser ran out of memory for this page. Try a smaller range or Balanced quality.'
    if (/could not find enough|already appears|valid PDF|page range|text layer|lost pages|page size/i.test(cause.message)) return cause.message
  }
  return 'OCR could not finish this PDF. Try a clearer scan, Balanced quality, or a smaller page range.'
}

export function OcrPdfPage() {
  useSeo(seo.seoTitle, seo.metaDescription, `/${slug}`, true, true)
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<OcrAnalysis | null>(null)
  const [phase, setPhase] = useState<'empty' | 'analyzing' | 'ready' | 'running' | 'canceling' | 'done'>('empty')
  const [mode, setMode] = useState<OcrMode>('smart')
  const [quality, setQuality] = useState<OcrQuality>('balanced')
  const [customPages, setCustomPages] = useState(false)
  const [range, setRange] = useState('')
  const [stage, setStage] = useState<OcrStage | null>(null)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const busy = useRef(false)
  const generation = useRef(0)

  const reset = () => {
    if (busy.current) return
    generation.current += 1
    setFile(null); setAnalysis(null); setPhase('empty'); setMode('smart'); setQuality('balanced')
    setCustomPages(false); setRange(''); setStage(null); setResult(null); setError('')
  }
  const accept = async (selected: File[]) => {
    if (busy.current) return
    reset()
    const token = generation.current
    try {
      validateFiles(selected, true)
      setFile(selected[0]); setPhase('analyzing')
      const next = await analyzeOcrFile(selected[0])
      if (token !== generation.current) return
      setAnalysis(next); setPhase('ready')
    } catch (cause) { if (token === generation.current) { setPhase('empty'); setFile(null); setError(friendlyError(cause)) } }
  }
  let selected: number[] = [], rangeError = ''
  if (analysis) {
    try { selected = selectOcrPages(analysis.hasText, mode, customPages ? range : '') }
    catch (cause) { rangeError = cause instanceof Error ? cause.message : 'Enter valid pages.' }
  }
  const searchable = analysis?.hasText.filter(Boolean).length ?? 0
  const process = async () => {
    if (!file || !analysis || busy.current || rangeError || !selected.length) return
    busy.current = true
    const current = new AbortController()
    controller.current = current
    setError(''); setResult(null); setPhase('running')
    try {
      const next = await runOcrPdf(file, analysis, { mode, quality, pages: customPages ? range : '', language: 'eng' }, current.signal, (progress) => { if (!current.signal.aborted) setStage(progress) })
      if (!current.signal.aborted) { setResult(next); setPhase('done') }
    } catch (cause) {
      if (!current.signal.aborted) { setError(friendlyError(cause)); setPhase('ready') }
    } finally {
      busy.current = false; controller.current = null
      if (current.signal.aborted) { setStage(null); setPhase('ready') }
    }
  }
  const cancel = () => { if (controller.current) { setPhase('canceling'); controller.current.abort() } }
  const name = safeBaseName(file?.name ?? 'document')

  return <main className="tool-page ocr-page"><SeoBreadcrumbs path="/ocr-pdf"/>
    <section className="tool-intro"><div className="tool-intro-copy"><div className="tool-title-row"><ToolIcon slug={slug} compact/><h1>OCR PDF</h1></div><p>Make scanned PDF pages searchable with local OCR. Recognize printed English text while keeping the original page appearance.</p></div></section>
    {error && <div className="error-panel" role="alert"><div><strong>We couldn’t continue</strong><p>{error}</p>{/password-protected/i.test(error) && <Link to="/unlock-pdf">Unlock PDF</Link>}</div></div>}
    <section className="workspace-card">
      {phase === 'empty' && <><FileDropzone accept={tool.accepts} onFiles={(files) => { void accept(files) }}/><p className="ocr-privacy">Processed locally in this browser. OCR engine and English language data download from PDFHope when needed; PDF pages are not uploaded.</p></>}
      {phase === 'analyzing' && <div className="configure-panel" role="status" aria-live="polite"><h2>Analyzing PDF</h2><p>Checking each page for an existing searchable text layer…</p></div>}
      {analysis && phase !== 'empty' && phase !== 'analyzing' && <>
        {phase !== 'done' && <div className="configure-panel"><div className="configure-title"><div><span className="step-label">Local OCR</span><h2>Make scanned pages searchable</h2><p>{file?.name} · {formatBytes(file?.size ?? 0)}</p></div><button className="text-button" onClick={reset} disabled={busy.current}>Start over</button></div>
          <div className="ocr-summary"><div><span>Pages</span><strong>{analysis.pageCount}</strong></div><div><span>Already searchable</span><strong>{searchable}</strong></div><div><span>Likely scans</span><strong>{analysis.pageCount - searchable}</strong></div></div>
          {searchable === analysis.pageCount && <p className="ocr-notice" role="status">This PDF already appears to contain searchable text. <Link to="/pdf-reader">Open PDF Reader</Link>, or choose OCR all selected pages below.</p>}
          <div className="ocr-settings"><fieldset><legend>OCR mode</legend><label><input type="radio" name="ocr-mode" checked={mode === 'smart'} onChange={() => setMode('smart')}/> Smart OCR — skip searchable pages</label><label><input type="radio" name="ocr-mode" checked={mode === 'force'} onChange={() => setMode('force')}/> OCR all selected pages</label></fieldset>
            {mode === 'force' && <p className="ocr-notice">Running OCR on pages that already contain text can create duplicate searchable text.</p>}
            <label className="field"><span>Language</span><select value="eng" aria-label="OCR language" disabled><option value="eng">English (verified)</option></select></label>
            <label className="field"><span>Quality</span><select value={quality} onChange={(event) => setQuality(event.target.value as OcrQuality)}><option value="balanced">Balanced · about 220 DPI</option><option value="high">High accuracy · about 300 DPI</option></select></label>
            <fieldset><legend>Pages</legend><label><input type="radio" name="ocr-pages" checked={!customPages} onChange={() => setCustomPages(false)}/> All pages needing OCR</label><label><input type="radio" name="ocr-pages" checked={customPages} onChange={() => setCustomPages(true)}/> Custom page range</label></fieldset>
            {customPages && <label className="field"><span>Page range, for example 1,3,5-8</span><input value={range} onChange={(event) => setRange(event.target.value)} placeholder="1,3,5-8" aria-invalid={!!rangeError}/></label>}
            {rangeError && <p className="ocr-error" role="alert">{rangeError}</p>}
          </div>
          <p className="setting-note" aria-live="polite">{selected.length} {selected.length === 1 ? 'page' : 'pages'} selected for OCR.</p>
          {selected.length > 100 && <p className="ocr-notice">Browser OCR can take significant time for this document. Consider a custom page range.</p>}
          <p className="ocr-notice">Creating a searchable copy can invalidate existing certificate-based digital signatures. Keep the original PDF.</p>
          <p className="setting-note">Only OCR engine and language data are downloaded from PDFHope. Your PDF pages are not uploaded. OCR is designed for printed text; handwriting may be inaccurate.</p>
          {(phase === 'running' || phase === 'canceling') && <div className="ocr-progress" role="status" aria-live="polite"><strong>{phase === 'canceling' ? 'Stopping OCR…' : stage?.label ?? 'Preparing OCR…'}</strong><span>{stage ? `${stage.completed} of ${stage.total} pages completed` : 'Loading'}</span></div>}
          <div className="process-bar"><span>Processed locally</span>{phase === 'running' ? <button className="secondary-button" onClick={cancel}>Cancel OCR</button> : phase === 'canceling' ? <button className="secondary-button" disabled>Stopping…</button> : <button className="primary-button" onClick={() => { void process() }} disabled={!selected.length || !!rangeError}>Make PDF Searchable</button>}</div>
        </div>}
        {phase === 'done' && result && <div className="result-panel"><span className="success-icon"><Check size={30}/></span><span className="kicker">Complete</span><h2>Searchable PDF ready</h2><p>The original visible pages remain in the PDF, with an invisible text layer added to recognized pages.</p><div className="ocr-summary"><div><span>Pages OCRed</span><strong>{result.pagesOcred}</strong></div><div><span>Pages skipped</span><strong>{result.pagesSkipped}</strong></div><div><span>Words</span><strong>{result.recognizedWords}</strong></div><div><span>Processing</span><strong>Local</strong></div></div><p className="setting-note">OCR confidence estimate: {result.averageConfidence ?? 'not available'}%. Check the copied text before relying on it.</p><button className="primary-button download-button" onClick={() => downloadBlob(result.output, `${name}-searchable.pdf`)}><Download size={19}/> Download searchable PDF</button><button className="secondary-button" onClick={() => downloadBlob(new Blob([result.extractedText], { type: 'text/plain;charset=utf-8' }), `${name}-ocr.txt`)}><Download size={17}/> Download extracted text</button><button className="secondary-button" onClick={reset}><RotateCcw size={17}/> Start over</button><p className="setting-note">Need a smaller copy? <Link to="/compress-pdf">Try Compress PDF</Link>, but aggressive compression may flatten searchable text.</p></div>}
      </>}
    </section><ToolSeoContent slug={slug}/>
  </main>
}
