import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Download, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { FileDropzone } from '../components/FileDropzone'
import { ToolSeoContent } from '../components/ToolSeoContent'
import { ToolIcon } from '../components/ToolIcon'
import { toolSeo } from '../data/toolSeo'
import { downloadBlob, safeBaseName, validateFiles } from '../lib/files'
import { openRenderedPdf } from '../lib/pdf/render'
import { exportSignedPdf, type SignaturePlacement } from '../lib/pdf/signature'
import { useSeo } from '../hooks/useSeo'

type Point = { x: number; y: number }
type Mode = 'draw' | 'type' | 'upload'
const padWidth = 640, padHeight = 180

function imageFromCanvas(canvas: HTMLCanvasElement) { return canvas.toDataURL('image/png') }
function typedSignature(value: string, color: string) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  context.font = 'italic 72px Georgia, serif'
  canvas.width = Math.min(900, Math.ceil(context.measureText(value).width) + 36); canvas.height = 112
  context.fillStyle = color; context.font = 'italic 72px Georgia, serif'; context.textBaseline = 'middle'
  context.fillText(value, 18, 56, canvas.width - 36)
  return { image: imageFromCanvas(canvas), aspect: canvas.width / canvas.height }
}

async function uploadedSignature(file: File) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Choose a PNG, JPG, or WebP signature image.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return { image: imageFromCanvas(canvas), aspect: canvas.width / canvas.height }
  } finally { bitmap.close() }
}

export function SignPdfPage() {
  const seo = toolSeo['sign-pdf']
  useSeo(seo.seoTitle, seo.metaDescription, '/sign-pdf', true, true)
  const [file, setFile] = useState<File | null>(null), [pages, setPages] = useState(0), [page, setPage] = useState(1)
  const [mode, setMode] = useState<Mode>('draw'), [color, setColor] = useState('#153b60'), [name, setName] = useState('')
  const [strokes, setStrokes] = useState<Point[][]>([]), [signature, setSignature] = useState(''), [aspect, setAspect] = useState(3)
  const [placements, setPlacements] = useState<SignaturePlacement[]>([]), [selected, setSelected] = useState<number | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState<Blob | null>(null)
  const pad = useRef<HTMLCanvasElement>(null), preview = useRef<HTMLCanvasElement>(null), surface = useRef<HTMLDivElement>(null), draft = useRef<Point[]>([]), nextId = useRef(1)
  const gesture = useRef<{ id: number; mode: 'move' | 'resize'; origin: Point; initial: SignaturePlacement } | null>(null)
  const active = placements.filter((item) => item.pageIndex === page - 1)
  const selectedPlacement = placements.find((item) => item.id === selected)

  const reset = () => { setFile(null); setPages(0); setPage(1); setMode('draw'); setStrokes([]); setSignature(''); setPlacements([]); setSelected(null); setResult(null); setName(''); setError('') }
  const accept = async (files: File[]) => {
    reset()
    try { validateFiles(files, true); const document = await openRenderedPdf(files[0]); setPages(document.numPages); await document.cleanup(); setFile(files[0]) }
    catch { setError('This PDF could not be opened. If it is password-protected, unlock it first with permission.') }
  }
  useEffect(() => {
    if (!file || !preview.current) return
    let cancelled = false
    void (async () => { const document = await openRenderedPdf(file); try { const pdfPage = await document.getPage(page), viewport = pdfPage.getViewport({ scale: 1.5 }), canvas = preview.current; if (!canvas || cancelled) return; canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); await pdfPage.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise } finally { await document.cleanup() } })().catch(() => { if (!cancelled) setError('Unable to render this page.') })
    return () => { cancelled = true }
  }, [file, page])
  useEffect(() => {
    const canvas = pad.current; if (!canvas) return
    const context = canvas.getContext('2d')!; context.clearRect(0, 0, padWidth, padHeight)
    context.strokeStyle = color; context.lineWidth = 3; context.lineCap = 'round'; context.lineJoin = 'round'
    for (const stroke of strokes) { if (!stroke.length) continue; context.beginPath(); context.moveTo(stroke[0].x, stroke[0].y); stroke.slice(1).forEach((point) => context.lineTo(point.x, point.y)); context.stroke() }
  }, [strokes, color, file, mode])
  const point = (event: ReactPointerEvent<HTMLCanvasElement>): Point => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * padWidth / rect.width, y: (event.clientY - rect.top) * padHeight / rect.height } }
  const drawDown = (event: ReactPointerEvent<HTMLCanvasElement>) => { draft.current = [point(event)]; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault() }
  const drawMove = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (!draft.current.length) return; draft.current.push(point(event)); const canvas = event.currentTarget, context = canvas.getContext('2d')!, a = draft.current.at(-2)!, b = draft.current.at(-1)!; context.strokeStyle = color; context.lineWidth = 3; context.lineCap = 'round'; context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke(); event.preventDefault() }
  const drawUp = (event: ReactPointerEvent<HTMLCanvasElement>) => { const completed = [...draft.current]; draft.current = []; if (completed.length) setStrokes((current) => [...current, completed]); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }
  const chooseSignature = () => {
    if (mode === 'draw') { if (!strokes.length || !pad.current) { setError('Draw a signature first.'); return }; setSignature(imageFromCanvas(pad.current)); setAspect(padWidth / padHeight) }
    if (mode === 'type') { if (!name.trim()) { setError('Type your name first.'); return }; const chosen = typedSignature(name.trim(), color); setSignature(chosen.image); setAspect(chosen.aspect) }
    setError('')
  }
  const upload = async (files: FileList | null) => { if (!files?.[0]) return; try { const image = await uploadedSignature(files[0]); setSignature(image.image); setAspect(image.aspect); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to read the image.') } }
  const place = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!signature || event.target !== event.currentTarget) return
    const rect = event.currentTarget.getBoundingClientRect(), width = rect.width < 500 ? .45 : .27, height = Math.min(.18, width * rect.width / (aspect * rect.height))
    const x = Math.max(0, Math.min(1 - width, (event.clientX - rect.left) / rect.width - width / 2)), y = Math.max(0, Math.min(1 - height, (event.clientY - rect.top) / rect.height - height / 2))
    const item = { id: nextId.current++, pageIndex: page - 1, x, y, width, height, image: signature }
    setPlacements((current) => [...current, item]); setSelected(item.id)
  }
  const placeAtCenter = () => { if (!signature || !surface.current) return; const rect = surface.current.getBoundingClientRect(), width = rect.width < 500 ? .45 : .27, height = Math.min(.18, width * rect.width / (aspect * rect.height)); const item = { id: nextId.current++, pageIndex: page - 1, x: (1 - width) / 2, y: (1 - height) / 2, width, height, image: signature }; setPlacements((current) => [...current, item]); setSelected(item.id) }
  const gestureDown = (event: ReactPointerEvent<HTMLDivElement>, item: SignaturePlacement, mode: 'move' | 'resize') => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); gesture.current = { id: item.id, mode, origin: { x: event.clientX, y: event.clientY }, initial: item }; setSelected(item.id); event.preventDefault() }
  const gestureMove = (event: ReactPointerEvent<HTMLDivElement>) => { const current = gesture.current, rect = surface.current?.getBoundingClientRect(); if (!current || !rect) return; const dx = (event.clientX - current.origin.x) / rect.width, dy = (event.clientY - current.origin.y) / rect.height; setPlacements((items) => items.map((item) => { if (item.id !== current.id) return item; const start = current.initial; if (current.mode === 'move') return { ...item, x: Math.max(0, Math.min(1 - start.width, start.x + dx)), y: Math.max(0, Math.min(1 - start.height, start.y + dy)) }; const width = Math.max(.06, Math.min(1 - start.x, start.width + dx)), height = Math.max(.025, Math.min(1 - start.y, start.height + dy)); return { ...item, width, height } })) }
  const setPlacementPercent = (key: 'x' | 'y' | 'width' | 'height', percent: number) => { if (selected === null || !Number.isFinite(percent)) return; setPlacements((items) => items.map((item) => { if (item.id !== selected) return item; const value = percent / 100; if (key === 'x') return { ...item, x: Math.max(0, Math.min(1 - item.width, value)) }; if (key === 'y') return { ...item, y: Math.max(0, Math.min(1 - item.height, value)) }; if (key === 'width') return { ...item, width: Math.max(.06, Math.min(1 - item.x, value)) }; return { ...item, height: Math.max(.025, Math.min(1 - item.y, value)) } })) }
  const exportPdf = async () => { if (!file) return; setBusy(true); setError(''); try { setResult(await exportSignedPdf(file, placements)) } catch { setError('Unable to add the signature to this PDF. Please try another file.') } finally { setBusy(false) } }
  return <main className="tool-page sign-page"><div className="tool-breadcrumb"><Link to="/tools">All tools</Link><span>/</span><span>Secure</span></div><section className="tool-intro"><div className="tool-intro-copy"><div className="tool-title-row"><ToolIcon slug="sign-pdf" compact/><h1>Sign PDF</h1></div><p>Draw, type, or upload a visible electronic signature and place it on PDF pages locally.</p></div></section>
    {error && <div className="error-panel" role="alert"><p>{error}</p></div>}
    <section className="workspace-card">{!file && <FileDropzone accept="application/pdf,.pdf" onFiles={(files) => { void accept(files) }}/>}
      {file && !result && <div className="sign-workspace"><div className="configure-title"><div><span className="step-label">Step 2</span><h2>Create and place your signature</h2><p>{file.name}</p></div><button className="text-button" onClick={reset}>Start over</button></div>
        <div className="sign-creator"><div className="sign-mode" role="group" aria-label="Signature method">{(['draw','type','upload'] as const).map((choice) => <button key={choice} className={mode === choice ? 'active' : ''} onClick={() => { setMode(choice); setSignature('') }}>{choice[0].toUpperCase() + choice.slice(1)}</button>)}</div>
          {mode === 'draw' && <><canvas ref={pad} width={padWidth} height={padHeight} aria-label="Signature drawing canvas" onPointerDown={drawDown} onPointerMove={drawMove} onPointerUp={drawUp} onPointerCancel={drawUp}/><div className="sign-actions"><button onClick={() => setStrokes((current) => current.slice(0,-1))}><Undo2 size={16}/> Undo stroke</button><button onClick={() => setStrokes([])}>Clear</button></div></>}
          {mode === 'type' && <label className="field"><span>Typed signature</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Type your name" maxLength={70}/></label>}
          {mode === 'upload' && <label className="field"><span>Upload PNG, JPG, or WebP</span><input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => { void upload(event.target.files); event.currentTarget.value = '' }}/></label>}
          <div className="sign-actions"><label>Color <select value={color} onChange={(event) => setColor(event.target.value)}><option value="#153b60">Dark blue</option><option value="#111111">Black</option></select></label>{mode !== 'upload' && <button className="secondary-button" onClick={chooseSignature}>Use signature</button>}</div>{signature && <div className="sign-chosen"><span>Signature preview</span><img src={signature} alt="Chosen signature"/><button onClick={() => setSignature('')}>Change signature</button></div>}</div>
        <div className="sign-pagination"><button disabled={page <= 1} onClick={() => { setPage(page-1); setSelected(null) }}>Previous</button><label>Page <input type="number" min={1} max={pages} value={page} onChange={(event) => setPage(Math.max(1, Math.min(pages, Number(event.target.value) || 1)))}/> of {pages}</label><button disabled={page >= pages} onClick={() => { setPage(page+1); setSelected(null) }}>Next</button></div>
        <p className="setting-note">{signature ? 'Click or tap the page to place the signature. Drag to move; use the corner handle to resize. Numeric position controls are available below.' : 'Create or upload a signature to place it on a page.'}</p><button className="secondary-button sign-place-center" disabled={!signature} onClick={placeAtCenter}>Place at center of page {page}</button><div className="sign-preview" ref={surface} onPointerDown={place}><canvas ref={preview}/>{active.map((item) => <div key={item.id} className={`sign-placement${selected === item.id ? ' selected' : ''}`} style={{ left:`${item.x*100}%`, top:`${item.y*100}%`, width:`${item.width*100}%`, height:`${item.height*100}%` }} onPointerDown={(event) => gestureDown(event, item, 'move')} onPointerMove={gestureMove} onPointerUp={() => { gesture.current = null }}><img src={item.image} alt="Placed signature" draggable={false}/><button className="sign-remove" aria-label={`Remove signature on page ${page}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => setPlacements((items) => items.filter((value) => value.id !== item.id))}><Trash2 size={15}/></button><div className="sign-resize" aria-hidden="true" onPointerDown={(event) => gestureDown(event, item, 'resize')}/></div>)}</div>
        {selectedPlacement && <div className="sign-position-controls"><strong>Selected signature on page {selectedPlacement.pageIndex + 1}</strong><div>{([['x','Left'],['y','Top'],['width','Width'],['height','Height']] as const).map(([key,label]) => <label key={key}>{label} %<input type="number" min={0} max={100} step={1} value={Math.round(selectedPlacement[key]*100)} onChange={(event) => setPlacementPercent(key, Number(event.target.value))}/></label>)}<button className="secondary-button" onClick={() => { setPlacements((items) => items.filter((item) => item.id !== selectedPlacement.id)); setSelected(null) }}>Remove selected signature</button></div></div>}
        <p className="security-notice">This tool adds a visible electronic signature. It does not create a certificate-based cryptographic digital signature. Editing or adding a visible signature can invalidate existing certificate-based signatures.</p><div className="process-bar"><span>{placements.length} placement{placements.length === 1 ? '' : 's'} · processed locally</span><button className="primary-button" disabled={!placements.length || busy} onClick={() => { void exportPdf() }}>{busy ? 'Preparing…' : 'Create signed PDF'}</button></div></div>}
      {result && <div className="result-panel"><span className="success-icon"><Check size={30}/></span><span className="kicker">Complete</span><h2>Your signed PDF is ready</h2><p>Visible electronic signature added locally. This is not a certificate-based digital signature.</p><div className="compression-metrics"><div><span>Electronic signature</span><strong>Added</strong></div><div><span>Processing</span><strong>Local</strong></div><div><span>Pages signed</span><strong>{new Set(placements.map((item) => item.pageIndex)).size}</strong></div></div><button className="primary-button download-button" onClick={() => downloadBlob(result, `${safeBaseName(file?.name || 'document')}-signed.pdf`)}><Download size={19}/> Download signed PDF</button><button className="secondary-button" onClick={reset}><RotateCcw size={17}/> Start over</button></div>}
    </section><ToolSeoContent slug="sign-pdf"/></main>
}
