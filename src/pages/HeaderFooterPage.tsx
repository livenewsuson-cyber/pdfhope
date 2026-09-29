import { AlertCircle, ArrowLeft, Check, Download, LockKeyhole, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileDropzone } from '../components/FileDropzone'
import { ToolIcon } from '../components/ToolIcon'
import { ToolSeoContent } from '../components/ToolSeoContent'
import { toolSeo } from '../data/toolSeo'
import { downloadBlob, formatBytes } from '../lib/files'
import { addHeaderFooterPdf, defaultHeaderFooterOptions, headerFooterFilename, resolveHeaderFooterText, selectedHeaderFooterPages, type HeaderFooterOptions } from '../lib/pdf/headerFooter'
import { inspectPdf } from '../lib/pdf/operations'
import { openRenderedPdf, renderPage } from '../lib/pdf/render'
import { useSeo } from '../hooks/useSeo'

export function HeaderFooterPage() {
  const seo = toolSeo['header-footer-pdf']
  useSeo(seo.seoTitle, seo.metaDescription, '/header-footer-pdf', true, true)
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState(0)
  const [options, setOptions] = useState<HeaderFooterOptions>(defaultHeaderFooterOptions)
  const [preview, setPreview] = useState<{ url: string; width: number; height: number; number: number } | null>(null)
  const [result, setResult] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = <K extends keyof HeaderFooterOptions>(key: K, value: HeaderFooterOptions[K]) => setOptions(current => ({ ...current, [key]: value }))
  const reset = () => { setFile(null); setPages(0); setPreview(null); setResult(null); setError(''); setOptions(defaultHeaderFooterOptions); if (input.current) input.current.value = '' }
  const choose = async (next?: File) => {
    if (!next) return
    try {
      if (!next.size || !next.name.toLowerCase().endsWith('.pdf')) throw new Error('Choose a non-empty PDF file.')
      const info = await inspectPdf(next)
      setFile(next); setPages(info.pageCount); setResult(null); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'This PDF could not be opened.') }
  }
  useEffect(() => {
    if (!file || !pages) return
    let cancelled = false
    const render = async () => {
      try {
        const first = selectedHeaderFooterPages(options.range, pages, options.skipFirst)[0]
        if (first === undefined) { setPreview(null); return }
        const pdf = await openRenderedPdf(file)
        try {
          const canvas = await renderPage(pdf, first + 1, .8)
          if (!cancelled) setPreview({ url: canvas.toDataURL('image/jpeg', .82), width: canvas.width, height: canvas.height, number: first + 1 })
          canvas.width = 0; canvas.height = 0
        } finally { await pdf.cleanup() }
      } catch { if (!cancelled) setPreview(null) }
    }
    void render()
    return () => { cancelled = true }
  }, [file, pages, options.range, options.skipFirst])
  const exportPdf = async () => {
    if (!file || busy) return
    setBusy(true); setError('')
    try { setResult(await addHeaderFooterPdf(file, options)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add headers and footers.') }
    finally { setBusy(false) }
  }
  const previewText = (template: string) => resolveHeaderFooterText(template, preview?.number ?? 1, pages, new Date())
  const previewStyle = { color: options.color, fontSize: `${Math.max(9, options.size * .8)}px`, fontFamily: options.font === 'Times Roman' ? 'Georgia, serif' : options.font === 'Courier' ? 'monospace' : 'Arial, sans-serif', fontWeight: options.style === 'bold' ? 700 : 400, fontStyle: options.style === 'italic' ? 'italic' : 'normal' }
  return <main className="tool-page header-footer-page"><div className="tool-breadcrumb"><Link to="/tools"><ArrowLeft size={16}/> All tools</Link><span>/</span><span>Edit</span></div>
    <section className="tool-intro"><div className="tool-intro-copy"><div className="tool-title-row"><ToolIcon slug="header-footer-pdf" compact/><h1>Header &amp; Footer</h1></div><p>Add repeated text, dates, or page numbers to selected PDF pages locally in your browser.</p></div></section>
    {error && <div className="error-panel" role="alert"><AlertCircle size={20}/><div><strong>We couldn’t continue</strong><p>{error}</p></div></div>}
    <section className={`workspace-card${!file ? ' workspace-card--empty' : ''}`}>
      <input ref={input} hidden type="file" accept="application/pdf,.pdf" onChange={event => void choose(event.target.files?.[0])}/>
      {!file ? <FileDropzone accept="application/pdf,.pdf" onFiles={files => void choose(files[0])}/> : <>
        <div className="file-queue"><div className="file-card"><span className="pdf-badge">PDF</span><span><strong>{file.name}</strong><small>{formatBytes(file.size)} · {pages} pages</small></span><button onClick={reset} aria-label={`Remove ${file.name}`}><RotateCcw size={17}/></button></div></div>
        {!result ? <div className="configure-panel header-footer-workspace"><div className="configure-title"><div><span className="step-label">Local PDF editing</span><h2>Set header and footer</h2></div><button className="text-button" onClick={() => input.current?.click()}>Change file</button></div>
          <div className="header-footer-layout"><div className="header-footer-fields">
            <fieldset className="header-footer-block"><legend>Header</legend><label className="header-footer-switch"><input type="checkbox" checked={options.header} onChange={event => update('header', event.target.checked)}/> Add header</label>{options.header && <><label className="field"><span>Header text</span><input value={options.headerText} maxLength={180} onChange={event => update('headerText', event.target.value)} placeholder="Report title or {date}"/></label><label className="field"><span>Alignment</span><select value={options.headerAlignment} onChange={event => update('headerAlignment', event.target.value as HeaderFooterOptions['headerAlignment'])}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></>}</fieldset>
            <fieldset className="header-footer-block"><legend>Footer</legend><label className="header-footer-switch"><input type="checkbox" checked={options.footer} onChange={event => update('footer', event.target.checked)}/> Add footer</label>{options.footer && <><label className="field"><span>Footer text</span><input value={options.footerText} maxLength={180} onChange={event => update('footerText', event.target.value)} placeholder="Page {page} of {pages}"/></label><label className="field"><span>Alignment</span><select value={options.footerAlignment} onChange={event => update('footerAlignment', event.target.value as HeaderFooterOptions['footerAlignment'])}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></>}</fieldset>
            <p className="setting-note">Tokens: <code>{'{page}'}</code> current page, <code>{'{pages}'}</code> total pages, <code>{'{date}'}</code> local export date.</p>
            <div className="header-footer-grid"><label className="field"><span>Font</span><select value={options.font} onChange={event => update('font', event.target.value as HeaderFooterOptions['font'])}><option>Helvetica</option><option>Times Roman</option><option>Courier</option></select></label><label className="field"><span>Style</span><select value={options.style} onChange={event => update('style', event.target.value as HeaderFooterOptions['style'])}><option value="regular">Regular</option><option value="bold">Bold</option><option value="italic">Italic</option></select></label><label className="field"><span>Font size (pt)</span><input type="number" min="8" max="24" value={options.size} onChange={event => update('size', Number(event.target.value))}/></label><label className="field"><span>Text color</span><input type="color" value={options.color} onChange={event => update('color', event.target.value)}/></label><label className="field"><span>Top margin (pt)</span><input type="number" min="8" max="144" value={options.topMargin} onChange={event => update('topMargin', Number(event.target.value))}/></label><label className="field"><span>Bottom margin (pt)</span><input type="number" min="8" max="144" value={options.bottomMargin} onChange={event => update('bottomMargin', Number(event.target.value))}/></label></div>
            <label className="field"><span>Pages (blank means all)</span><input value={options.range} onChange={event => update('range', event.target.value)} placeholder="1-3,5,8-12"/></label><label className="header-footer-switch"><input type="checkbox" checked={options.skipFirst} onChange={event => update('skipFirst', event.target.checked)}/> Skip first page</label>
            <p className="compression-warning" role="note">Adding headers or footers may invalidate existing digital signatures.</p>
          </div><div className="header-footer-preview"><strong>Page preview</strong><p>Representative page {preview?.number ?? '—'} of {pages}</p>{preview ? <div className="header-footer-preview-page" style={{aspectRatio:`${preview.width} / ${preview.height}`}}><img src={preview.url} alt={`Source PDF page ${preview.number} preview`}/>{options.header && options.headerText.trim() && <span className={`header-footer-preview-text align-${options.headerAlignment}`} style={{...previewStyle,top:`${Math.min(25,Math.max(2,options.topMargin/preview.height*80))}%`}}>{previewText(options.headerText)}</span>}{options.footer && options.footerText.trim() && <span className={`header-footer-preview-text align-${options.footerAlignment}`} style={{...previewStyle,bottom:`${Math.min(25,Math.max(2,options.bottomMargin/preview.height*80))}%`}}>{previewText(options.footerText)}</span>}</div> : <div className="header-footer-preview-loading">Preparing preview…</div>}<small>Preview approximates placement. Review the downloaded PDF for final positioning.</small></div></div>
          <div className="process-bar"><span><LockKeyhole size={16}/> Runs locally in this tab · no PDFHope watermark added</span><button className="primary-button" disabled={busy} onClick={() => void exportPdf()}>{busy ? 'Adding page text…' : 'Add header & footer'}</button></div>
        </div> : <div className="result-panel"><span className="success-icon"><Check size={30}/></span><span className="kicker">Complete</span><h2>Your PDF is ready</h2><p>Text was added locally without rasterizing the original pages.</p><button className="primary-button download-button" onClick={() => downloadBlob(result, headerFooterFilename(file.name))}><Download size={19}/> Download PDF</button><button className="secondary-button" onClick={() => setResult(null)}><RotateCcw size={17}/> Adjust settings</button></div>}
      </>}
    </section><ToolSeoContent slug="header-footer-pdf"/>
  </main>
}
