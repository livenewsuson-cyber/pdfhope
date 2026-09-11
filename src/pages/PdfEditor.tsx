import { ArrowDown, ArrowUp, Bold, Download, FilePlus, FileText, Highlighter, ImagePlus, Italic, Minus, MousePointer2, PenLine, Plus, Redo2, Square, Trash2, Type, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { openRenderedPdf } from '../lib/pdf/render'
import { downloadBlob } from '../lib/files'
import { loadPdfiumDocument, type PdfiumDocument, type PdfiumTextObject } from '../lib/pdfium'
import { useSeo } from '../hooks/useSeo'

type Obj = {
  id: number
  page?: number
  kind: 'text' | 'shape' | 'highlight' | 'image' | 'signature' | 'drawing'
  x: number
  y: number
  w: number
  h: number
  color: string
  text?: string
  size?: number
  bold?: boolean
  italic?: boolean
}

type Hist = { objects: Obj[]; deleted: number[]; order: number[] }
type DragState = { id: number; startX: number; startY: number; x: number; y: number; before: Hist; moved: boolean }

const clone = (value: Hist): Hist => JSON.parse(JSON.stringify(value))
const sameHistory = (left: Hist, right: Hist) => JSON.stringify(left) === JSON.stringify(right)

function colorFromHex(value: string) {
  const hex = value.replace('#', '')
  const numeric = Number.parseInt(hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex, 16)
  if (!Number.isFinite(numeric)) return rgb(0.08, 0.23, 0.21)
  return rgb(((numeric >> 16) & 255) / 255, ((numeric >> 8) & 255) / 255, (numeric & 255) / 255)
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.matches('input, textarea') || target.isContentEditable)
}

export function PdfEditor() {
  useSeo('Edit Existing PDF Text Online — PDFHope', 'Edit existing text in supported text-based PDFs directly in your browser, or add annotations, signatures, images, and drawings locally.', '/edit-pdf')
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [tool, setTool] = useState<'select' | 'existing' | 'text' | 'highlight' | 'shape' | 'draw' | 'image' | 'signature'>('select')
  const [objects, setObjects] = useState<Obj[]>([])
  const [deleted, setDeleted] = useState<number[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [history, setHistory] = useState<Hist[]>([])
  const [future, setFuture] = useState<Hist[]>([])
  const [error, setError] = useState('')
  const [pages, setPages] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [dark, setDark] = useState(false)
  const [pdfium, setPdfium] = useState<PdfiumDocument | null>(null)
  const [textObjects, setTextObjects] = useState<PdfiumTextObject[]>([])
  const [selectedText, setSelectedText] = useState<PdfiumTextObject | null>(null)
  const [replacement, setReplacement] = useState('')
  const [pdfiumBusy, setPdfiumBusy] = useState(false)
  const [pdfiumHistory, setPdfiumHistory] = useState<Uint8Array[]>([])
  const [pdfiumFuture, setPdfiumFuture] = useState<Uint8Array[]>([])
  const input = useRef<HTMLInputElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const textInput = useRef<HTMLTextAreaElement>(null)
  const editingBefore = useRef<Hist | null>(null)
  const dragState = useRef<DragState | null>(null)
  const nextObjectId = useRef(1)

  const snapshot = (): Hist => clone({ objects, deleted, order })
  const selectedObject = useMemo(() => objects.find((object) => object.id === selected) ?? null, [objects, selected])
  const pushHistory = (before: Hist) => { setHistory((current) => [...current, clone(before)]); setFuture([]) }
  const commit = (next: Partial<Hist>) => { pushHistory(snapshot()); if (next.objects) setObjects(next.objects); if (next.deleted) setDeleted(next.deleted); if (next.order) setOrder(next.order) }

  const finishTextEdit = (removeEmpty = true) => {
    if (editingId === null) return
    const current = objects.find((object) => object.id === editingId)
    const before = editingBefore.current
    setEditingId(null)
    editingBefore.current = null
    if (!current) return
    if (removeEmpty && !current.text?.trim()) { setObjects((items) => items.filter((object) => object.id !== current.id)); setSelected(null); return }
    const after = snapshot()
    if (before && !sameHistory(before, after)) pushHistory(before)
  }

  const beginTextEdit = (id: number) => {
    const object = objects.find((item) => item.id === id)
    if (!object || object.kind !== 'text') return
    if (editingId !== id) editingBefore.current = snapshot()
    setSelected(id); setSelectedText(null); setTool('select'); setEditingId(id)
  }

  useEffect(() => {
    if (editingId === null) return
    const frame = requestAnimationFrame(() => { textInput.current?.focus(); const length = textInput.current?.value.length ?? 0; textInput.current?.setSelectionRange(length, length) })
    return () => cancelAnimationFrame(frame)
  }, [editingId])

  const load = async (next: File) => {
    finishTextEdit(); setFile(next); setError(''); setSelected(null); setSelectedText(null); setEditingId(null); editingBefore.current = null; setObjects([]); setDeleted([]); setHistory([]); setFuture([]); setPdfiumHistory([]); setPdfiumFuture([]); setTool('select')
    try {
      const rendered = await openRenderedPdf(next)
      setDoc(rendered); setPages(rendered.numPages); setOrder(Array.from({ length: rendered.numPages }, (_, index) => index + 1)); setPage(1)
      pdfium?.close(); setPdfium(null); setTextObjects([])
    } catch (caught) { setError(/password|encrypted/i.test(String(caught)) ? 'This PDF is password-protected. Unlock it with permission first.' : 'This PDF appears corrupted or unsupported.') }
  }

  useEffect(() => {
    if (!doc || !canvas.current) return
    const render = async () => { const pdfPage = await doc.getPage(page); const viewport = pdfPage.getViewport({ scale }); canvas.current!.width = Math.ceil(viewport.width); canvas.current!.height = Math.ceil(viewport.height); await pdfPage.render({ canvasContext: canvas.current!.getContext('2d')!, viewport }).promise }
    void render().catch(() => setError('This page could not be rendered.'))
  }, [doc, page, scale])
  useEffect(() => () => { pdfium?.close() }, [pdfium])

  const enableExisting = async () => {
    finishTextEdit(); if (!file) return; setSelected(null); setTool('existing'); if (pdfium) return; setPdfiumBusy(true)
    try { const engine = await loadPdfiumDocument(new Uint8Array(await file.arrayBuffer())); const found = Array.from({ length: engine.pageCount }, (_, index) => engine.listTextObjects(index)).flat(); setPdfium(engine); setTextObjects(found); setError(found.length ? '' : 'No supported selectable text objects were found. Scanned, outlined, encrypted, or unusual PDFs may not support direct editing.') }
    catch (caught) { setError(String(caught).replace(/^Error:\s*/, '') || 'PDFium could not open this PDF.') }
    finally { setPdfiumBusy(false) }
  }

  const createObject = (kind: Obj['kind'], x: number, y: number) => {
    const id = nextObjectId.current++
    const isText = kind === 'text'
    const object: Obj = { id, page, kind, x, y, w: isText ? 220 : 170, h: isText ? 80 : 42, color: kind === 'highlight' ? '#f2be44' : '#143b36', text: isText ? '' : kind === 'signature' ? 'Signature' : kind === 'image' ? 'Image' : '', size: 18 }
    const nextObjects = [...objects, object]
    pushHistory(snapshot()); setObjects(nextObjects); setSelected(id); setSelectedText(null)
    if (isText) { editingBefore.current = clone({ objects: nextObjects, deleted, order }); setEditingId(id); setTool('select') }
  }

  const removeSelected = () => { if (selected === null || editingId !== null) return; commit({ objects: objects.filter((object) => object.id !== selected) }); setSelected(null) }
  const updateSelected = (patch: Partial<Obj>) => { if (selected === null) return; commit({ objects: objects.map((object) => object.id === selected ? { ...object, ...patch } : object) }) }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || editingId !== null) return
      if (selected !== null && (event.key === 'Delete' || event.key === 'Backspace')) { event.preventDefault(); removeSelected() }
    }
    addEventListener('keydown', onKeyDown)
    return () => removeEventListener('keydown', onKeyDown)
  })

  const reloadPdfium = async (bytes: Uint8Array) => { if (!file) return; pdfium?.close(); const next = await loadPdfiumDocument(bytes); setPdfium(next); setTextObjects(Array.from({ length: next.pageCount }, (_, index) => next.listTextObjects(index)).flat()); const nextFile = new File([bytes as BlobPart], file.name, { type: 'application/pdf' }); setFile(nextFile); setDoc(await openRenderedPdf(nextFile)) }
  const undo = async () => {
    finishTextEdit()
    if (pdfiumHistory.length) { setPdfiumBusy(true); try { const current = pdfium ? await pdfium.save() : null; const previous = pdfiumHistory.at(-1)!; if (current) setPdfiumFuture((items) => [current, ...items]); setPdfiumHistory((items) => items.slice(0, -1)); await reloadPdfium(previous) } catch (caught) { setError(String(caught)) } finally { setPdfiumBusy(false) }; return }
    const previous = history.at(-1); if (!previous) return; setFuture((items) => [snapshot(), ...items]); setHistory((items) => items.slice(0, -1)); setObjects(previous.objects); setDeleted(previous.deleted); setOrder(previous.order); setSelected(null)
  }
  const redo = async () => {
    finishTextEdit()
    if (pdfiumFuture.length) { setPdfiumBusy(true); try { const current = pdfium ? await pdfium.save() : null; const next = pdfiumFuture[0]; if (current) setPdfiumHistory((items) => [...items, current]); setPdfiumFuture((items) => items.slice(1)); await reloadPdfium(next) } catch (caught) { setError(String(caught)) } finally { setPdfiumBusy(false) }; return }
    const next = future[0]; if (!next) return; setHistory((items) => [...items, snapshot()]); setFuture((items) => items.slice(1)); setObjects(next.objects); setDeleted(next.deleted); setOrder(next.order); setSelected(null)
  }

  const onCanvas = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!wrap.current) return
    const bounds = wrap.current.getBoundingClientRect(); const x = (event.clientX - bounds.left) / scale; const y = (event.clientY - bounds.top) / scale
    if (editingId !== null) finishTextEdit()
    if (tool === 'existing') { const height = (canvas.current?.height || 0) / scale; const hit = [...textObjects].reverse().find((object) => object.pageIndex === page - 1 && x >= object.x && x <= object.x + object.width && y >= height - object.y - object.height && y <= height - object.y); if (hit) { setSelectedText(hit); setReplacement(hit.text) } else setSelectedText(null); return }
    if (tool === 'text' || tool === 'highlight' || tool === 'shape' || tool === 'signature' || tool === 'image' || tool === 'draw') { createObject(tool === 'shape' ? 'shape' : tool === 'highlight' ? 'highlight' : tool === 'draw' ? 'drawing' : tool, x, y); return }
    setSelected(null); setSelectedText(null)
  }

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, object: Obj) => { event.stopPropagation(); setSelected(object.id); setSelectedText(null); if (tool !== 'select' || editingId !== null) return; dragState.current = { id: object.id, startX: event.clientX, startY: event.clientY, x: object.x, y: object.y, before: snapshot(), moved: false }; event.currentTarget.setPointerCapture(event.pointerId) }
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => { const drag = dragState.current; if (!drag || drag.id !== Number(event.currentTarget.dataset.objectId)) return; const dx = (event.clientX - drag.startX) / scale; const dy = (event.clientY - drag.startY) / scale; if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true; setObjects((items) => items.map((object) => object.id === drag.id ? { ...object, x: Math.max(0, drag.x + dx), y: Math.max(0, drag.y + dy) } : object)) }
  const endDrag = () => { const drag = dragState.current; dragState.current = null; if (drag?.moved) pushHistory(drag.before) }

  const applyExisting = async () => {
    if (!pdfium || !selectedText || !replacement.trim()) { setError('Select a supported text object and enter replacement text.'); return }
    setPdfiumBusy(true); setError('')
    try { const before = await pdfium.save(); const old = selectedText.text; pdfium.replaceTextObject(selectedText, replacement); const bytes = await pdfium.save(); const verification = await openRenderedPdf(new File([bytes as BlobPart], 'verification.pdf', { type: 'application/pdf' })); const pageText = await (await verification.getPage(selectedText.pageIndex + 1)).getTextContent(); const extracted = pageText.items.map((item: any) => item.str).join(' '); await verification.cleanup(); if (extracted.includes(old) || !extracted.includes(replacement)) throw new Error('PDFium export verification failed: the original text was not replaced and the new text was not searchable.'); const next = new File([bytes as BlobPart], file?.name || 'edited.pdf', { type: 'application/pdf' }); setFile(next); setDoc(await openRenderedPdf(next)); const refreshed = Array.from({ length: pdfium.pageCount }, (_, index) => pdfium.listTextObjects(index)).flat(); setTextObjects(refreshed); setSelectedText(refreshed.find((object) => object.pageIndex === selectedText.pageIndex && object.text === replacement) || null); setPdfiumHistory((items) => [...items, before]); setPdfiumFuture([]) }
    catch (caught) { setError(String(caught).replace(/^Error:\s*/, '') || 'This text cannot be edited directly because of how this PDF stores its content.') }
    finally { setPdfiumBusy(false) }
  }

  const exportPdf = async () => {
    if (!file || !doc) return
    finishTextEdit()
    try {
      const source = pdfium ? await pdfium.save() : new Uint8Array(await file.arrayBuffer()); const pdf = await PDFDocument.load(source, { ignoreEncryption: false }); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold); const italic = await pdf.embedFont(StandardFonts.HelveticaOblique); const boldItalic = await pdf.embedFont(StandardFonts.HelveticaBoldOblique); const pagesRef = pdf.getPages()
      for (const [index, pdfPage] of pagesRef.entries()) {
        if (deleted.includes(index + 1)) continue
        for (const object of objects.filter((item) => item.page === index + 1)) {
          const bottom = pdfPage.getHeight() - object.y - object.h
          if (object.kind === 'text' || object.kind === 'signature') {
            if (!object.text) continue
            const size = object.size || 18
            const font = object.bold && object.italic ? boldItalic : object.bold ? bold : object.italic ? italic : regular
            pdfPage.drawText(object.text, { x: object.x, y: pdfPage.getHeight() - object.y - size, size, lineHeight: size * 1.2, font, color: colorFromHex(object.color) })
          } else if (object.kind === 'highlight') {
            pdfPage.drawRectangle({ x: object.x, y: bottom, width: object.w, height: object.h, color: rgb(0.95, 0.75, 0.18), opacity: 0.38 })
          } else if (object.kind === 'shape') {
            pdfPage.drawRectangle({ x: object.x, y: bottom, width: object.w, height: object.h, borderColor: rgb(0.08, 0.23, 0.21), borderWidth: 2 })
          } else {
            pdfPage.drawLine({ start: { x: object.x, y: bottom }, end: { x: object.x + object.w, y: bottom + object.h }, thickness: 2, color: rgb(0.08, 0.23, 0.21) })
          }
        }
      }
      const bytes = await pdf.save(); downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${file.name.replace(/\.pdf$/i, '')}-edited.pdf`)
    } catch { setError('Export failed. Check that the PDF is not encrypted and that all direct text edits were supported.') }
  }

  const pageEdit = (action: 'delete' | 'duplicate' | 'blank' | 'up' | 'down') => { finishTextEdit(); if (action === 'delete') commit({ deleted: [...deleted, page] }); if (action === 'duplicate') commit({ order: [...order.slice(0, page), page, ...order.slice(page)] }); if (action === 'blank') commit({ order: [...order.slice(0, page), 0, ...order.slice(page)] }); if (action === 'up' && page > 1) setPage(page - 1); if (action === 'down' && page < pages) setPage(page + 1) }

  return <main className={`editor-page ${dark ? 'editor-dark' : ''}`}>
    <section className="editor-head"><div><span className="kicker">PDFHope Editor</span><h1>Edit with confidence.</h1><p>Edit supported existing PDF text directly, or add text, images, signatures, drawings, and page-level changes locally.</p></div><div><button className="secondary-button" onClick={() => input.current?.click()}><FilePlus size={17} /> Open PDF</button><input hidden ref={input} type="file" accept="application/pdf,.pdf" onChange={(event) => event.target.files?.[0] && void load(event.target.files[0])} /></div></section>
    {error && <div className="error-panel"><X size={18} /><p>{error}</p></div>}
    {!file ? <section className="editor-empty" onClick={() => input.current?.click()}><FileText size={43} /><h2>Drop a PDF to start editing</h2><p>Everything runs in this tab. No uploads, no account wall.</p></section> : <section className="editor-shell">
      <div className="editor-toolbar"><button className={tool === 'select' ? 'active' : ''} onClick={() => { finishTextEdit(); setTool('select') }}><MousePointer2 size={17} /> Select</button><button className={tool === 'existing' ? 'active' : ''} onClick={() => void enableExisting()}><Type size={17} /> Edit existing text</button><button className={tool === 'text' ? 'active' : ''} onClick={() => { finishTextEdit(); setTool('text') }}><Type size={17} /> Add text</button><button onClick={() => { finishTextEdit(); setTool('image') }}><ImagePlus size={17} /> Image</button><button onClick={() => { finishTextEdit(); setTool('signature') }}><PenLine size={17} /> Signature</button><button onClick={() => { finishTextEdit(); setTool('draw') }}><PenLine size={17} /> Draw</button><button onClick={() => { finishTextEdit(); setTool('highlight') }}><Highlighter size={17} /> Highlight</button><button onClick={() => { finishTextEdit(); setTool('shape') }}><Square size={17} /> Shape</button><span className="editor-spacer" /><button onClick={() => void undo()} disabled={!history.length && !pdfiumHistory.length}><Undo2 size={17} /> Undo</button><button onClick={() => void redo()} disabled={!future.length && !pdfiumFuture.length}><Redo2 size={17} /> Redo</button><button onClick={() => setScale(Math.max(0.5, scale - 0.1))}><Minus size={17} /></button><span>{Math.round(scale * 100)}%</span><button onClick={() => setScale(Math.min(2.5, scale + 0.1))}><Plus size={17} /></button><button onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'} mode</button><button className="primary-button" onClick={() => void exportPdf()}><Download size={17} /> Export PDF</button></div>
      <div className="editor-body"><aside className="editor-thumbs"><strong>Pages <small>{pages}</small></strong>{order.map((number, index) => <button key={`${number}-${index}`} className={index + 1 === page ? 'active' : ''} onClick={() => setPage(index + 1)}><span>{index + 1}</span><span>{number ? 'PDF' : 'Blank'}</span></button>)}</aside><div className="editor-center"><div ref={wrap} className={`editor-canvas-wrap ${tool === 'existing' ? 'existing-mode' : ''}`} onPointerDown={onCanvas}><canvas ref={canvas} />
        {tool === 'existing' && textObjects.filter((object) => object.pageIndex === page - 1).map((object) => <button key={object.handle} className={`existing-text-box ${selectedText?.handle === object.handle ? 'selected' : ''}`} style={{ left: object.x * scale, top: Math.max(0, ((canvas.current?.height || 0) / scale - object.y - object.height)) * scale, width: object.width * scale, height: object.height * scale }} onPointerDown={(event) => event.stopPropagation()} onClick={() => { setSelectedText(object); setReplacement(object.text) }} title={object.supported ? 'Click to select, double-click to edit' : 'Direct editing unavailable for this text'}>{object.text}</button>)}
        {objects.filter((object) => !object.page || object.page === page).map((object) => editingId === object.id && object.kind === 'text' ? <textarea key={object.id} ref={textInput} className="editor-text-input" aria-label="Edit added text" value={object.text || ''} style={{ left: object.x * scale, top: object.y * scale, width: object.w * scale, height: object.h * scale, color: object.color, fontSize: (object.size || 18) * scale, fontWeight: object.bold ? 'bold' : 'normal', fontStyle: object.italic ? 'italic' : 'normal' }} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => setObjects((items) => items.map((item) => item.id === object.id ? { ...item, text: event.target.value } : item))} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finishTextEdit(false) } }} onBlur={() => finishTextEdit()} /> : <button type="button" key={object.id} data-object-id={object.id} className={`editor-object ${object.kind} ${selected === object.id ? 'selected' : ''}`} style={{ left: object.x * scale, top: object.y * scale, width: object.w * scale, height: object.h * scale, color: object.color, fontSize: (object.size || 18) * scale, fontWeight: object.bold ? 'bold' : 'normal', fontStyle: object.italic ? 'italic' : 'normal' }} onPointerDown={(event) => startDrag(event, object)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={() => { setSelected(object.id); setSelectedText(null) }} onDoubleClick={() => beginTextEdit(object.id)}>{object.kind === 'shape' ? <Square size={18} /> : object.text || object.kind}</button>)}
      </div><div className="editor-nav"><button onClick={() => setPage(Math.max(1, page - 1))}><ArrowUp size={16} /> Previous</button><span>Page {page} of {pages}</span><button onClick={() => setPage(Math.min(pages, page + 1))}>Next <ArrowDown size={16} /></button></div></div>
      <aside className="editor-properties"><h3>Properties</h3>{selectedText && tool === 'existing' ? <><p><strong>Existing text</strong></p><label>Original text<textarea value={selectedText.text} readOnly /></label><label>Replacement text<textarea value={replacement} onChange={(event) => setReplacement(event.target.value)} /></label><p className="editor-note">{selectedText.supported ? 'Supported direct edit · Original font preserved where PDFium allows it.' : 'Unsupported: this PDF text has no usable Unicode mapping.'}<br />Font: {selectedText.fontName} · Size: {selectedText.fontSize.toFixed(1)} pt</p><button className="primary-button" disabled={pdfiumBusy || !selectedText.supported} onClick={() => void applyExisting()}>{pdfiumBusy ? 'Applying…' : 'Apply change'}</button></> : selectedObject ? <><p><strong>{selectedObject.kind === 'text' ? 'Added text' : 'Selected object'}</strong></p>{selectedObject.kind === 'text' && <><button className="secondary-button" onClick={() => beginTextEdit(selectedObject.id)}><Type size={16} /> Edit text</button><label>Font size<input type="number" min="8" max="96" value={selectedObject.size || 18} onChange={(event) => updateSelected({ size: Math.max(8, Math.min(96, Number(event.target.value) || 18)) })} /></label><label>Text color<input type="color" value={selectedObject.color} onChange={(event) => updateSelected({ color: event.target.value })} /></label></>}<button className="secondary-button" onClick={removeSelected}><Trash2 size={16} /> Delete object</button><div className="property-row"><button aria-label="Bold" className={selectedObject.bold ? 'active' : ''} onPointerDown={(event) => event.preventDefault()} onClick={() => updateSelected({ bold: !selectedObject.bold })}><Bold size={16} /></button><button aria-label="Italic" className={selectedObject.italic ? 'active' : ''} onPointerDown={(event) => event.preventDefault()} onClick={() => updateSelected({ italic: !selectedObject.italic })}><Italic size={16} /></button></div></> : <p className="muted">Choose Add text, then click the page and type. Double-click added text to edit it later.</p>}<hr /><h3>Page actions</h3><button onClick={() => pageEdit('delete')}><Trash2 size={16} /> Delete page</button><button onClick={() => pageEdit('duplicate')}><FileText size={16} /> Duplicate page</button><button onClick={() => pageEdit('blank')}><FilePlus size={16} /> Insert blank page</button><button onClick={() => pageEdit('up')}><ArrowUp size={16} /> Previous page</button><button onClick={() => pageEdit('down')}><ArrowDown size={16} /> Next page</button><p className="editor-note"><strong>Scope</strong><br />Direct existing-text editing uses PDFium page objects. Scanned pages, outlined text, unusual encodings, nested XObjects, and encrypted/restricted PDFs may be unavailable. Visual replacement is not presented as true editing.</p><Link to="/pdf-health-check">Run PDF Health Check →</Link></aside></div>
    </section>}
    <section className="editor-copy"><article><span className="kicker">Local-first workspace</span><h2>A desktop-style editor without uploading your document.</h2><p>PDFium changes supported underlying text objects; PDF.js renders the result and pdf-lib continues to power added overlays and utility edits.</p></article><aside><h3>Editor FAQ</h3><details><summary>Can it edit existing text?</summary><p>Yes. PDFHope can directly edit existing text in supported text-based PDFs. The editor changes the underlying PDF text object rather than simply covering it with new text. Some PDFs, including scanned documents, outlined text, unusual font encodings, and complex PDF structures, may not support direct editing. PDFHope will tell you when direct editing is unavailable.</p></details><details><summary>Are black boxes redaction?</summary><p>No. This editor does not implement permanent redaction. A rectangle is only an annotation and must never be treated as content removal.</p></details></aside></section>
  </main>
}

