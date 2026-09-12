import { ArrowDown, ArrowRight, ArrowUp, Bold, Brush, Circle, Download, Eraser, FilePlus, FileText, Highlighter, ImagePlus, Italic, Minus, MousePointer2, Paintbrush, PenLine, Plus, Redo2, Square, Trash2, Type, Undo2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { degrees, PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { downloadBlob } from '../lib/files'
import { openRenderedPdf } from '../lib/pdf/render'
import { loadPdfiumDocument, type PdfiumDocument, type PdfiumTextObject } from '../lib/pdfium'
import { useSeo } from '../hooks/useSeo'

type Tool = 'select' | 'edit-existing-text' | 'add-text' | 'image' | 'signature' | 'draw' | 'highlight' | 'shape'
type ShapeKind = 'rectangle' | 'ellipse' | 'line' | 'arrow'
type DrawKind = 'pencil' | 'brush' | 'eraser'
type Point = { x: number; y: number }
type EditorObject = {
  id: number; pageIndex: number; type: 'text' | 'image' | 'signature' | 'drawing' | 'highlight' | 'shape'
  x: number; y: number; width: number; height: number; opacity: number; rotation: number
  text?: string; fontSize?: number; color?: string; bold?: boolean; italic?: boolean
  dataUrl?: string; aspectRatio?: number; points?: Point[]
  strokeColor?: string; strokeWidth?: number; fillColor?: string; fillOpacity?: number; shape?: ShapeKind
}
type EditorState = { objects: EditorObject[]; deletedPages: number[]; pageOrder: number[] }
type HistoryEntry = { before: EditorState; after: EditorState; beforePdf?: Uint8Array; afterPdf?: Uint8Array }
type Transform = { id: number; kind: 'move' | 'resize'; startX: number; startY: number; original: EditorObject; before: EditorState; moved: boolean }
type Gesture = { kind: 'highlight' | 'shape' | 'drawing' | 'erase'; start: Point; points: Point[]; before: EditorState; erasedIds: Set<number> }

const clone = (value: EditorState): EditorState => structuredClone(value)
const equal = (a: EditorState, b: EditorState) => JSON.stringify(a) === JSON.stringify(b)
const typingTarget = (target: EventTarget | null) => target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const pdfColor = (value = '#143b36') => { const clean = value.replace('#', ''); const number = Number.parseInt(clean.length === 3 ? clean.split('').map((part) => part + part).join('') : clean, 16); return Number.isFinite(number) ? rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255) : rgb(.08, .23, .21) }
const bytesFromDataUrl = (url: string) => Uint8Array.from(atob(url.split(',')[1]), (character) => character.charCodeAt(0))

export function PdfEditor() {
  useSeo('Edit Existing PDF Text Online — PDFHope', 'Edit existing PDF text or add text, images, signatures, drawings, highlights, and shapes locally in your browser.', '/edit-pdf')
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<any>(null)
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [tool, setTool] = useState<Tool>('select')
  const [state, setState] = useState<EditorState>({ objects: [], deletedPages: [], pageOrder: [] })
  const stateRef = useRef(state)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const historyRef = useRef(history), futureRef = useRef(future)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [dark, setDark] = useState(false)
  const [error, setError] = useState('')
  const [pdfium, setPdfium] = useState<PdfiumDocument | null>(null)
  const [textObjects, setTextObjects] = useState<PdfiumTextObject[]>([])
  const [selectedText, setSelectedText] = useState<PdfiumTextObject | null>(null)
  const [replacement, setReplacement] = useState('')
  const [pdfiumBusy, setPdfiumBusy] = useState(false)
  const [drawKind, setDrawKind] = useState<DrawKind>('pencil')
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rectangle')
  const [strokeColor, setStrokeColor] = useState('#143b36')
  const [highlightColor, setHighlightColor] = useState('#f2be44')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [toolOpacity, setToolOpacity] = useState(.45)
  const [draft, setDraft] = useState<Point[]>([])
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [signatureStrokes, setSignatureStrokes] = useState<Point[][]>([])
  const [signatureColor, setSignatureColor] = useState('#143b36')
  const [signatureWidth, setSignatureWidth] = useState(3)
  const pdfInput = useRef<HTMLInputElement>(null), imageInput = useRef<HTMLInputElement>(null), signatureInput = useRef<HTMLInputElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null), wrap = useRef<HTMLDivElement>(null), textInput = useRef<HTMLTextAreaElement>(null), signatureCanvas = useRef<HTMLCanvasElement>(null)
  const editingBefore = useRef<EditorState | null>(null), propertyBefore = useRef<EditorState | null>(null)
  const transform = useRef<Transform | null>(null), gesture = useRef<Gesture | null>(null), signatureDraft = useRef<Point[]>([])
  const nextId = useRef(1)

  const updateState = (next: EditorState | ((current: EditorState) => EditorState)) => setState((current) => { const value = typeof next === 'function' ? next(current) : next; stateRef.current = value; return value })
  const record = (entry: HistoryEntry) => { if (equal(entry.before, entry.after) && !entry.beforePdf) return; historyRef.current = [...historyRef.current, entry]; setHistory(historyRef.current); futureRef.current = []; setFuture([]) }
  const commit = (after: EditorState) => { const before = clone(stateRef.current); updateState(after); record({ before, after: clone(after) }) }
  const selectedObject = useMemo(() => state.objects.find((object) => object.id === selectedId) ?? null, [state.objects, selectedId])
  const pageCount = state.pageOrder.length || pages

  const finishTextEdit = (removeEmpty = true) => {
    if (editingId === null) return
    const current = stateRef.current, object = current.objects.find((item) => item.id === editingId), before = editingBefore.current
    setEditingId(null); editingBefore.current = null
    if (!object) return
    if (removeEmpty && !object.text?.trim()) { const after = { ...current, objects: current.objects.filter((item) => item.id !== object.id) }; updateState(after); setSelectedId(null); if (before) record({ before, after: clone(after) }); return }
    if (before) record({ before, after: clone(current) })
  }
  const beginTextEdit = (id: number) => { const object = stateRef.current.objects.find((item) => item.id === id); if (!object || object.type !== 'text') return; finishTextEdit(); editingBefore.current = clone(stateRef.current); setSelectedId(id); setSelectedText(null); setTool('select'); setEditingId(id) }
  useEffect(() => { if (editingId === null) return; const frame = requestAnimationFrame(() => { textInput.current?.focus(); const length = textInput.current?.value.length ?? 0; textInput.current?.setSelectionRange(length, length) }); return () => cancelAnimationFrame(frame) }, [editingId])
  const switchTool = (next: Tool) => { finishTextEdit(); gesture.current = null; setDraft([]); setSelectedText(null); setTool(next); if (next !== 'select') setSelectedId(null) }

  const load = async (next: File) => {
    finishTextEdit(); setError(''); setSelectedId(null); setSelectedText(null); setEditingId(null); setTool('select')
    const empty = { objects: [], deletedPages: [], pageOrder: [] }; updateState(empty); historyRef.current = []; futureRef.current = []; setHistory([]); setFuture([])
    try { const rendered = await openRenderedPdf(next); setFile(next); setDoc(rendered); setPages(rendered.numPages); updateState({ ...empty, pageOrder: Array.from({ length: rendered.numPages }, (_, index) => index + 1) }); setPage(1); pdfium?.close(); setPdfium(null); setTextObjects([]) }
    catch (caught) { setError(/password|encrypted/i.test(String(caught)) ? 'This PDF is password-protected.' : 'This PDF appears corrupted or unsupported.') }
  }
  useEffect(() => {
    if (!doc || !canvas.current) return
    let cancelled = false
    const run = async () => { const number = state.pageOrder[page - 1]; if (!number) { const context = canvas.current!.getContext('2d')!; canvas.current!.width = 612 * scale; canvas.current!.height = 792 * scale; context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.current!.width, canvas.current!.height); return } const current = await doc.getPage(number); const viewport = current.getViewport({ scale }); if (cancelled || !canvas.current) return; canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height); await current.render({ canvasContext: canvas.current.getContext('2d')!, viewport }).promise }
    void run().catch(() => setError('This page could not be rendered.')); return () => { cancelled = true }
  }, [doc, page, scale, state.pageOrder])
  useEffect(() => () => pdfium?.close(), [pdfium])

  const point = (event: ReactPointerEvent): Point => { const bounds = wrap.current!.getBoundingClientRect(); return { x: (event.clientX - bounds.left) / scale, y: (event.clientY - bounds.top) / scale } }
  const addObject = (partial: Omit<EditorObject, 'id' | 'pageIndex'>, select = true) => { const object = { ...partial, id: nextId.current++, pageIndex: page - 1 }; const before = clone(stateRef.current), after = { ...before, objects: [...before.objects, object] }; updateState(after); record({ before, after: clone(after) }); setSelectedId(select ? object.id : null); return object }
  const addText = (location: Point) => { const before = clone(stateRef.current); const object: EditorObject = { id: nextId.current++, pageIndex: page - 1, type: 'text', x: location.x, y: location.y, width: 220, height: 80, opacity: 1, rotation: 0, text: '', fontSize: 18, color: '#143b36' }; updateState({ ...before, objects: [...before.objects, object] }); editingBefore.current = before; setSelectedId(object.id); setTool('select'); setEditingId(object.id) }
  const decodeImage = async (chosen: File) => { if (!/^image\/(png|jpeg|webp)$/.test(chosen.type)) throw new Error('Choose a PNG, JPG/JPEG, or WebP image.'); const bitmap = await createImageBitmap(chosen); const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)); const target = document.createElement('canvas'); target.width = Math.max(1, Math.round(bitmap.width * ratio)); target.height = Math.max(1, Math.round(bitmap.height * ratio)); target.getContext('2d')!.drawImage(bitmap, 0, 0, target.width, target.height); bitmap.close(); return { dataUrl: target.toDataURL('image/png'), aspectRatio: target.width / target.height } }
  const placeImage = async (chosen: File, type: 'image' | 'signature') => { try { const decoded = await decodeImage(chosen), pageWidth = (canvas.current?.width || 612) / scale, pageHeight = (canvas.current?.height || 792) / scale, width = Math.min(type === 'signature' ? 210 : 260, pageWidth * .55), height = width / decoded.aspectRatio; addObject({ type, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height, opacity: 1, rotation: 0, ...decoded }); setTool('select'); setError('') } catch (caught) { setError(String(caught).replace(/^Error:\s*/, '') || 'The image could not be decoded.') } }

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!wrap.current) return
    const here = point(event); finishTextEdit()
    if (tool === 'edit-existing-text') { const height = (canvas.current?.height || 0) / scale, sourcePage = (state.pageOrder[page - 1] || page) - 1; const hit = [...textObjects].reverse().find((object) => object.pageIndex === sourcePage && here.x >= object.x && here.x <= object.x + object.width && here.y >= height - object.y - object.height && here.y <= height - object.y); setSelectedText(hit || null); if (hit) setReplacement(hit.text); return }
    if (tool === 'add-text') { addText(here); return }
    if (tool === 'highlight' || tool === 'shape' || tool === 'draw') { const kind = tool === 'draw' ? (drawKind === 'eraser' ? 'erase' : 'drawing') : tool; gesture.current = { kind, start: here, points: [here], before: clone(stateRef.current), erasedIds: new Set() }; setDraft([here]); event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); return }
    setSelectedId(null); setSelectedText(null)
  }
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = gesture.current; if (!active) return
    const here = point(event); active.points.push(here); setDraft([...active.points]); event.preventDefault()
    if (active.kind === 'erase') { stateRef.current.objects.filter((object) => object.pageIndex === page - 1 && object.type === 'drawing' && here.x >= object.x - 10 && here.x <= object.x + object.width + 10 && here.y >= object.y - 10 && here.y <= object.y + object.height + 10).forEach((object) => active.erasedIds.add(object.id)); updateState((current) => ({ ...current, objects: current.objects.filter((object) => !active.erasedIds.has(object.id)) })) }
  }
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = gesture.current; if (!active) return
    gesture.current = null; setDraft([]); event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (active.kind === 'erase') { record({ before: active.before, after: clone(stateRef.current) }); return }
    const end = active.points.at(-1) || active.start, x = Math.min(active.start.x, end.x), y = Math.min(active.start.y, end.y), width = Math.max(4, Math.abs(end.x - active.start.x)), height = Math.max(4, Math.abs(end.y - active.start.y))
    if (active.kind === 'highlight') { addObject({ type: 'highlight', x, y, width, height, opacity: toolOpacity, rotation: 0, color: highlightColor }, false); return }
    if (active.kind === 'shape') { addObject({ type: 'shape', x, y, width, height, opacity: 1, rotation: 0, shape: shapeKind, strokeColor, strokeWidth, fillColor: '#ffffff', fillOpacity: 0 }, false); return }
    const minX = Math.min(...active.points.map((item) => item.x)), minY = Math.min(...active.points.map((item) => item.y)), maxX = Math.max(...active.points.map((item) => item.x)), maxY = Math.max(...active.points.map((item) => item.y)), w = Math.max(2, maxX - minX), h = Math.max(2, maxY - minY), points = active.points.map((item) => ({ x: (item.x - minX) / w, y: (item.y - minY) / h }))
    addObject({ type: 'drawing', x: minX, y: minY, width: w, height: h, opacity: toolOpacity, rotation: 0, points, strokeColor, strokeWidth: drawKind === 'brush' ? Math.max(7, strokeWidth) : Math.min(4, strokeWidth) }, false)
  }

  const transformDown = (event: ReactPointerEvent<HTMLElement>, object: EditorObject, kind: 'move' | 'resize') => { if (tool !== 'select') return; event.stopPropagation(); finishTextEdit(); setSelectedId(object.id); setSelectedText(null); transform.current = { id: object.id, kind, startX: event.clientX, startY: event.clientY, original: structuredClone(object), before: clone(stateRef.current), moved: false }; event.currentTarget.setPointerCapture(event.pointerId) }
  const transformMove = (event: ReactPointerEvent<HTMLElement>) => { const active = transform.current; if (!active) return; const dx = (event.clientX - active.startX) / scale, dy = (event.clientY - active.startY) / scale; if (Math.abs(dx) + Math.abs(dy) > 2) active.moved = true; updateState((current) => ({ ...current, objects: current.objects.map((object) => { if (object.id !== active.id) return object; if (active.kind === 'move') return { ...object, x: Math.max(0, active.original.x + dx), y: Math.max(0, active.original.y + dy) }; const width = Math.max(18, active.original.width + dx), height = object.aspectRatio ? width / object.aspectRatio : Math.max(18, active.original.height + dy); return { ...object, width, height } }) })) }
  const transformUp = () => { const active = transform.current; transform.current = null; if (active?.moved) record({ before: active.before, after: clone(stateRef.current) }) }

  const enableExisting = async () => { if (!file) return; switchTool('edit-existing-text'); if (pdfium) return; setPdfiumBusy(true); try { const engine = await loadPdfiumDocument(new Uint8Array(await file.arrayBuffer())), found = Array.from({ length: engine.pageCount }, (_, index) => engine.listTextObjects(index)).flat(); setPdfium(engine); setTextObjects(found); setError(found.length ? '' : 'No supported selectable text objects were found.') } catch (caught) { setError(String(caught).replace(/^Error:\s*/, '') || 'PDFium could not open this PDF.') } finally { setPdfiumBusy(false) } }
  const reloadPdfium = async (bytes: Uint8Array) => { pdfium?.close(); const engine = await loadPdfiumDocument(bytes); setPdfium(engine); setTextObjects(Array.from({ length: engine.pageCount }, (_, index) => engine.listTextObjects(index)).flat()); const next = new File([bytes as BlobPart], file?.name || 'edited.pdf', { type: 'application/pdf' }); setFile(next); setDoc(await openRenderedPdf(next)) }
  const applyExisting = async () => { if (!pdfium || !selectedText || !replacement.trim()) { setError('Select supported text and enter a replacement.'); return } setPdfiumBusy(true); setError(''); try { const beforePdf = await pdfium.save(), old = selectedText.text; pdfium.replaceTextObject(selectedText, replacement); const afterPdf = await pdfium.save(), verification = await openRenderedPdf(new File([afterPdf as BlobPart], 'verify.pdf', { type: 'application/pdf' })), content = await (await verification.getPage(selectedText.pageIndex + 1)).getTextContent(), extracted = content.items.map((item: any) => item.str).join(' '); await verification.cleanup(); if (extracted.includes(old) || !extracted.includes(replacement)) throw new Error('PDFium verification failed.'); await reloadPdfium(afterPdf); const snapshot = clone(stateRef.current); record({ before: snapshot, after: snapshot, beforePdf, afterPdf }); setSelectedText(null) } catch (caught) { setError(String(caught).replace(/^Error:\s*/, '') || 'This text cannot be edited directly.') } finally { setPdfiumBusy(false) } }

  const undo = async () => { finishTextEdit(); const entry = historyRef.current.at(-1); if (!entry) return; historyRef.current = historyRef.current.slice(0, -1); setHistory(historyRef.current); futureRef.current = [entry, ...futureRef.current]; setFuture(futureRef.current); updateState(clone(entry.before)); setSelectedId(null); if (entry.beforePdf) { setPdfiumBusy(true); try { await reloadPdfium(entry.beforePdf) } finally { setPdfiumBusy(false) } } }
  const redo = async () => { finishTextEdit(); const entry = futureRef.current[0]; if (!entry) return; futureRef.current = futureRef.current.slice(1); setFuture(futureRef.current); historyRef.current = [...historyRef.current, entry]; setHistory(historyRef.current); updateState(clone(entry.after)); setSelectedId(null); if (entry.afterPdf) { setPdfiumBusy(true); try { await reloadPdfium(entry.afterPdf) } finally { setPdfiumBusy(false) } } }
  const removeSelected = () => { if (editingId !== null || selectedId === null) return; commit({ ...stateRef.current, objects: stateRef.current.objects.filter((object) => object.id !== selectedId) }); setSelectedId(null) }
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (typingTarget(event.target)) return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); void (event.shiftKey ? redo() : undo()); return } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); void redo(); return } if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId !== null) { event.preventDefault(); removeSelected() } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) })

  const propertyStart = () => { if (!propertyBefore.current) propertyBefore.current = clone(stateRef.current) }
  const propertyEnd = () => { const before = propertyBefore.current; propertyBefore.current = null; if (before) record({ before, after: clone(stateRef.current) }) }
  const updateSelected = (patch: Partial<EditorObject>) => updateState((current) => ({ ...current, objects: current.objects.map((object) => object.id === selectedId ? { ...object, ...patch } : object) }))
  const toggleSelected = (patch: Partial<EditorObject>) => { const before = clone(stateRef.current), after = { ...before, objects: before.objects.map((object) => object.id === selectedId ? { ...object, ...patch } : object) }; updateState(after); record({ before, after: clone(after) }) }
  const pageEdit = (kind: 'delete' | 'duplicate' | 'blank') => { const before = clone(stateRef.current); let after = before; if (kind === 'delete') after = { ...before, deletedPages: [...new Set([...before.deletedPages, page])] }; if (kind === 'duplicate') after = { ...before, pageOrder: [...before.pageOrder.slice(0, page), before.pageOrder[page - 1], ...before.pageOrder.slice(page)] }; if (kind === 'blank') after = { ...before, pageOrder: [...before.pageOrder.slice(0, page), 0, ...before.pageOrder.slice(page)] }; updateState(after); record({ before, after: clone(after) }) }

  const exportPdf = async () => {
    if (!file) return
    finishTextEdit()
    try {
      const sourceBytes = pdfium ? await pdfium.save() : new Uint8Array(await file.arrayBuffer()), source = await PDFDocument.load(sourceBytes, { ignoreEncryption: false }), pageEdits = state.pageOrder.some((value, index) => value !== index + 1) || state.deletedPages.length > 0
      let output = source
      const outputObjectPages: number[] = []
      if (pageEdits) { output = await PDFDocument.create(); for (const [index, sourceNumber] of state.pageOrder.entries()) { if (state.deletedPages.includes(index + 1)) continue; outputObjectPages.push(index); if (!sourceNumber) output.addPage([612, 792]); else { const [copied] = await output.copyPages(source, [sourceNumber - 1]); output.addPage(copied) } } } else outputObjectPages.push(...state.pageOrder.map((_, index) => index))
      const regular = await output.embedFont(StandardFonts.Helvetica), bold = await output.embedFont(StandardFonts.HelveticaBold), italic = await output.embedFont(StandardFonts.HelveticaOblique), boldItalic = await output.embedFont(StandardFonts.HelveticaBoldOblique)
      for (const [index, pdfPage] of output.getPages().entries()) for (const object of state.objects.filter((item) => item.pageIndex === outputObjectPages[index])) {
        const bottom = pdfPage.getHeight() - object.y - object.height, opacity = clamp(object.opacity, 0, 1)
        if (object.type === 'text' && object.text) { const font = object.bold && object.italic ? boldItalic : object.bold ? bold : object.italic ? italic : regular, size = object.fontSize || 18; pdfPage.drawText(object.text, { x: object.x, y: pdfPage.getHeight() - object.y - size, size, lineHeight: size * 1.2, font, color: pdfColor(object.color), opacity, rotate: degrees(object.rotation) }) }
        if ((object.type === 'image' || object.type === 'signature') && object.dataUrl) { const embedded = await output.embedPng(bytesFromDataUrl(object.dataUrl)); pdfPage.drawImage(embedded, { x: object.x, y: bottom, width: object.width, height: object.height, opacity, rotate: degrees(object.rotation) }) }
        if (object.type === 'highlight') pdfPage.drawRectangle({ x: object.x, y: bottom, width: object.width, height: object.height, color: pdfColor(object.color || '#f2be44'), opacity })
        if (object.type === 'shape') { const shared = { borderColor: pdfColor(object.strokeColor), borderWidth: object.strokeWidth || 2, color: pdfColor(object.fillColor || '#ffffff'), opacity: object.fillOpacity || 0, borderOpacity: opacity }; if (object.shape === 'rectangle') pdfPage.drawRectangle({ x: object.x, y: bottom, width: object.width, height: object.height, ...shared }); else if (object.shape === 'ellipse') pdfPage.drawEllipse({ x: object.x + object.width / 2, y: bottom + object.height / 2, xScale: object.width / 2, yScale: object.height / 2, ...shared }); else { const start = { x: object.x, y: bottom + object.height }, end = { x: object.x + object.width, y: bottom }; pdfPage.drawLine({ start, end, thickness: object.strokeWidth || 2, color: pdfColor(object.strokeColor), opacity }); if (object.shape === 'arrow') { const angle = Math.atan2(end.y - start.y, end.x - start.x); for (const delta of [-.55, .55]) pdfPage.drawLine({ start: end, end: { x: end.x - 12 * Math.cos(angle + delta), y: end.y - 12 * Math.sin(angle + delta) }, thickness: object.strokeWidth || 2, color: pdfColor(object.strokeColor), opacity }) } } }
        if (object.type === 'drawing' && object.points) for (let i = 1; i < object.points.length; i++) { const a = object.points[i - 1], b = object.points[i]; pdfPage.drawLine({ start: { x: object.x + a.x * object.width, y: pdfPage.getHeight() - object.y - a.y * object.height }, end: { x: object.x + b.x * object.width, y: pdfPage.getHeight() - object.y - b.y * object.height }, thickness: object.strokeWidth || 2, color: pdfColor(object.strokeColor), opacity }) }
      }
      downloadBlob(new Blob([await output.save() as BlobPart], { type: 'application/pdf' }), `${file.name.replace(/\.pdf$/i, '')}-edited.pdf`)
    } catch (caught) { setError(`Export failed: ${String(caught).replace(/^Error:\s*/, '')}`) }
  }

  const redrawSignature = () => { const target = signatureCanvas.current; if (!target) return; const context = target.getContext('2d')!; context.clearRect(0, 0, target.width, target.height); context.strokeStyle = signatureColor; context.lineWidth = signatureWidth; context.lineCap = 'round'; context.lineJoin = 'round'; for (const stroke of signatureStrokes) { if (!stroke.length) continue; context.beginPath(); context.moveTo(stroke[0].x, stroke[0].y); stroke.slice(1).forEach((item) => context.lineTo(item.x, item.y)); context.stroke() } }
  useEffect(redrawSignature, [signatureStrokes, signatureColor, signatureWidth, signatureOpen])
  const signaturePoint = (event: ReactPointerEvent<HTMLCanvasElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * event.currentTarget.width / bounds.width, y: (event.clientY - bounds.top) * event.currentTarget.height / bounds.height } }
  const signatureDown = (event: ReactPointerEvent<HTMLCanvasElement>) => { signatureDraft.current = [signaturePoint(event)]; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault() }
  const signatureMove = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (!signatureDraft.current.length) return; const current = signaturePoint(event), previous = signatureDraft.current.at(-1)!; signatureDraft.current.push(current); const context = event.currentTarget.getContext('2d')!; context.strokeStyle = signatureColor; context.lineWidth = signatureWidth; context.lineCap = 'round'; context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(current.x, current.y); context.stroke(); event.preventDefault() }
  const signatureUp = () => { if (signatureDraft.current.length) setSignatureStrokes((current) => [...current, [...signatureDraft.current]]); signatureDraft.current = [] }
  const addSignature = () => { if (!signatureStrokes.length || !signatureCanvas.current) { setError('Draw a signature before adding it.'); return } const png = bytesFromDataUrl(signatureCanvas.current.toDataURL('image/png')); void placeImage(new File([png as BlobPart], 'signature.png', { type: 'image/png' }), 'signature'); setSignatureOpen(false); setSignatureStrokes([]) }

  const objectView = (object: EditorObject) => {
    if (editingId === object.id && object.type === 'text') return <textarea key={object.id} ref={textInput} className="editor-text-input" aria-label="Edit added text" value={object.text || ''} style={{ left: object.x * scale, top: object.y * scale, width: object.width * scale, height: object.height * scale, color: object.color, fontSize: (object.fontSize || 18) * scale }} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => updateState((current) => ({ ...current, objects: current.objects.map((item) => item.id === object.id ? { ...item, text: event.target.value } : item) }))} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finishTextEdit(false) } }} onBlur={() => finishTextEdit()} />
    return <button type="button" key={object.id} aria-label={`${object.type} object`} className={`editor-object ${object.type} ${selectedId === object.id ? 'selected' : ''}`} style={{ left: object.x * scale, top: object.y * scale, width: object.width * scale, height: object.height * scale, opacity: object.opacity, transform: `rotate(${object.rotation}deg)`, color: object.color, fontSize: (object.fontSize || 18) * scale, fontWeight: object.bold ? 'bold' : 'normal', fontStyle: object.italic ? 'italic' : 'normal' }} onPointerDown={(event) => transformDown(event, object, 'move')} onPointerMove={transformMove} onPointerUp={transformUp} onPointerCancel={transformUp} onDoubleClick={() => beginTextEdit(object.id)}>
      {object.type === 'text' && object.text}{(object.type === 'image' || object.type === 'signature') && <img src={object.dataUrl} alt="" draggable={false} />}{object.type === 'highlight' && <span className="highlight-fill" />}
      {object.type === 'shape' && <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{object.shape === 'rectangle' && <rect x="2" y="2" width="96" height="96" fill={object.fillColor} fillOpacity={object.fillOpacity} stroke={object.strokeColor} strokeWidth={object.strokeWidth} vectorEffect="non-scaling-stroke" />}{object.shape === 'ellipse' && <ellipse cx="50" cy="50" rx="48" ry="48" fill={object.fillColor} fillOpacity={object.fillOpacity} stroke={object.strokeColor} strokeWidth={object.strokeWidth} vectorEffect="non-scaling-stroke" />}{(object.shape === 'line' || object.shape === 'arrow') && <><line x1="2" y1="98" x2="98" y2="2" stroke={object.strokeColor} strokeWidth={object.strokeWidth} vectorEffect="non-scaling-stroke" />{object.shape === 'arrow' && <polyline points="78,2 98,2 98,22" fill="none" stroke={object.strokeColor} strokeWidth={object.strokeWidth} vectorEffect="non-scaling-stroke" />}</>}</svg>}
      {object.type === 'drawing' && <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><polyline points={object.points?.map((item) => `${item.x},${item.y}`).join(' ')} fill="none" stroke={object.strokeColor} strokeWidth={(object.strokeWidth || 2) / Math.max(object.width, object.height)} strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {selectedId === object.id && <span className="resize-handle" aria-label="Resize object" onPointerDown={(event) => transformDown(event, object, 'resize')} onPointerMove={transformMove} onPointerUp={transformUp} onPointerCancel={transformUp} />}
    </button>
  }

  return <main className={`editor-page ${dark ? 'editor-dark' : ''}`}>
    <section className="editor-head"><div><span className="kicker">PDFHope Editor</span><h1>Edit with confidence.</h1><p>Edit existing text or add text, images, signatures, drawings, highlights, and shapes locally.</p></div><div><button className="secondary-button" onClick={() => pdfInput.current?.click()}><FilePlus size={17} /> Open PDF</button><input hidden ref={pdfInput} type="file" accept="application/pdf,.pdf" onChange={(event) => event.target.files?.[0] && void load(event.target.files[0])} /><input hidden ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const chosen = event.target.files?.[0]; if (chosen) void placeImage(chosen, 'image'); event.currentTarget.value = '' }} /><input hidden ref={signatureInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const chosen = event.target.files?.[0]; if (chosen) { void placeImage(chosen, 'signature'); setSignatureOpen(false) } event.currentTarget.value = '' }} /></div></section>
    {error && <div className="error-panel"><X size={18} /><p>{error}</p></div>}
    {!file ? <section className="editor-empty" onClick={() => pdfInput.current?.click()}><FileText size={43} /><h2>Drop a PDF to start editing</h2><p>Everything runs in this tab. No uploads, no account wall.</p></section> : <section className="editor-shell">
      <div className="editor-toolbar"><button className={tool === 'select' ? 'active' : ''} onClick={() => switchTool('select')}><MousePointer2 size={17} /> Select</button><button className={tool === 'edit-existing-text' ? 'active' : ''} onClick={() => void enableExisting()}><Type size={17} /> Edit existing text</button><button className={tool === 'add-text' ? 'active' : ''} onClick={() => switchTool('add-text')}><Type size={17} /> Add text</button><button onClick={() => { switchTool('image'); imageInput.current?.click() }}><ImagePlus size={17} /> Image</button><button className={signatureOpen ? 'active' : ''} onClick={() => { switchTool('signature'); setSignatureOpen(true) }}><PenLine size={17} /> Signature</button><button className={tool === 'draw' ? 'active' : ''} onClick={() => switchTool('draw')}><Paintbrush size={17} /> Draw</button><button className={tool === 'highlight' ? 'active' : ''} onClick={() => switchTool('highlight')}><Highlighter size={17} /> Highlight</button><button className={tool === 'shape' ? 'active' : ''} onClick={() => switchTool('shape')}><Square size={17} /> Shapes</button><span className="editor-spacer" /><button onClick={() => void undo()} disabled={!history.length}><Undo2 size={17} /> Undo</button><button onClick={() => void redo()} disabled={!future.length}><Redo2 size={17} /> Redo</button><button onClick={() => setScale(Math.max(.5, scale - .1))}><Minus size={17} /></button><span>{Math.round(scale * 100)}%</span><button onClick={() => setScale(Math.min(2.5, scale + .1))}><Plus size={17} /></button><button onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'} mode</button><button className="primary-button" onClick={() => void exportPdf()}><Download size={17} /> Export PDF</button></div>
      {(tool === 'draw' || tool === 'highlight' || tool === 'shape') && <div className="editor-tool-options">{tool === 'draw' && <><button className={drawKind === 'pencil' ? 'active' : ''} onClick={() => setDrawKind('pencil')}><PenLine size={15} /> Pencil</button><button className={drawKind === 'brush' ? 'active' : ''} onClick={() => setDrawKind('brush')}><Brush size={15} /> Brush</button><button className={drawKind === 'eraser' ? 'active' : ''} onClick={() => setDrawKind('eraser')}><Eraser size={15} /> Eraser</button></>}{tool === 'shape' && (['rectangle', 'ellipse', 'line', 'arrow'] as ShapeKind[]).map((kind) => <button key={kind} className={shapeKind === kind ? 'active' : ''} onClick={() => setShapeKind(kind)}>{kind === 'rectangle' ? <Square size={15} /> : kind === 'ellipse' ? <Circle size={15} /> : kind === 'arrow' ? <ArrowRight size={15} /> : <Minus size={15} />}{kind}</button>)}<label>Color <input aria-label="Tool color" type="color" value={tool === 'highlight' ? highlightColor : strokeColor} onChange={(event) => tool === 'highlight' ? setHighlightColor(event.target.value) : setStrokeColor(event.target.value)} /></label>{tool !== 'highlight' && <label>Width <input aria-label="Tool stroke width" type="range" min="1" max="18" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} /></label>}<label>Opacity <input aria-label="Tool opacity" type="range" min=".1" max="1" step=".05" value={toolOpacity} onChange={(event) => setToolOpacity(Number(event.target.value))} /></label></div>}
      <div className="editor-body"><aside className="editor-thumbs"><strong>Pages <small>{pageCount}</small></strong>{state.pageOrder.map((number, index) => <button key={`${number}-${index}`} className={index + 1 === page ? 'active' : ''} onClick={() => setPage(index + 1)}><span>{index + 1}</span><span>{number ? 'PDF' : 'Blank'}</span></button>)}</aside><div className="editor-center"><div ref={wrap} className={`editor-canvas-wrap tool-${tool}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}><canvas ref={canvas} />
        {tool === 'edit-existing-text' && textObjects.filter((object) => object.pageIndex === (state.pageOrder[page - 1] || page) - 1).map((object) => <button key={object.handle} className={`existing-text-box ${selectedText?.handle === object.handle ? 'selected' : ''}`} style={{ left: object.x * scale, top: Math.max(0, ((canvas.current?.height || 0) / scale - object.y - object.height)) * scale, width: object.width * scale, height: object.height * scale }} onPointerDown={(event) => event.stopPropagation()} onClick={() => { setSelectedText(object); setReplacement(object.text) }}>{object.text}</button>)}
        {state.objects.filter((object) => object.pageIndex === page - 1).map(objectView)}
        {!!draft.length && gesture.current?.kind !== 'erase' && <svg className="editor-draft" viewBox={`0 0 ${(canvas.current?.width || 1) / scale} ${(canvas.current?.height || 1) / scale}`} style={{ width: canvas.current?.width, height: canvas.current?.height }}>{gesture.current?.kind === 'drawing' ? <polyline points={draft.map((item) => `${item.x},${item.y}`).join(' ')} fill="none" stroke={strokeColor} strokeWidth={drawKind === 'brush' ? Math.max(7, strokeWidth) : Math.min(4, strokeWidth)} strokeLinecap="round" /> : <rect x={Math.min(draft[0].x, draft.at(-1)!.x)} y={Math.min(draft[0].y, draft.at(-1)!.y)} width={Math.abs(draft.at(-1)!.x - draft[0].x)} height={Math.abs(draft.at(-1)!.y - draft[0].y)} fill={gesture.current?.kind === 'highlight' ? highlightColor : 'transparent'} fillOpacity={toolOpacity} stroke={gesture.current?.kind === 'highlight' ? highlightColor : strokeColor} strokeWidth="2" />}</svg>}
      </div><div className="editor-nav"><button onClick={() => setPage(Math.max(1, page - 1))}><ArrowUp size={16} /> Previous</button><span>Page {page} of {pageCount}</span><button onClick={() => setPage(Math.min(pageCount, page + 1))}>Next <ArrowDown size={16} /></button></div></div>
      <aside className="editor-properties">
        <h3>Properties</h3>
        {selectedText && tool === 'edit-existing-text' ? <>
          <p><strong>Existing text</strong></p>
          <label>Original text<textarea value={selectedText.text} readOnly /></label>
          <label>Replacement text<textarea value={replacement} onChange={(event) => setReplacement(event.target.value)} /></label>
          <p className="editor-note">{selectedText.supported ? 'Supported direct edit.' : 'Unsupported text encoding.'}<br />Font: {selectedText.fontName} · Size: {selectedText.fontSize.toFixed(1)} pt</p>
          <button className="primary-button" disabled={pdfiumBusy || !selectedText.supported} onClick={() => void applyExisting()}>{pdfiumBusy ? 'Applying…' : 'Apply change'}</button>
        </> : selectedObject ? <>
          <p><strong>{selectedObject.type[0].toUpperCase() + selectedObject.type.slice(1)}</strong></p>
          {selectedObject.type === 'text' && <>
            <button className="secondary-button" onClick={() => beginTextEdit(selectedObject.id)}><Type size={16} /> Edit text</button>
            <label>Font size<input type="number" min="8" max="96" value={selectedObject.fontSize || 18} onFocus={propertyStart} onChange={(event) => updateSelected({ fontSize: clamp(Number(event.target.value) || 18, 8, 96) })} onBlur={propertyEnd} /></label>
            <label>Text color<input type="color" value={selectedObject.color} onFocus={propertyStart} onChange={(event) => updateSelected({ color: event.target.value })} onBlur={propertyEnd} /></label>
          </>}
          {selectedObject.type !== 'text' && <>
            <label>Width<input aria-label="Object width" type="number" min="18" value={Math.round(selectedObject.width)} onFocus={propertyStart} onChange={(event) => { const width = Math.max(18, Number(event.target.value) || 18); updateSelected({ width, ...(selectedObject.aspectRatio ? { height: width / selectedObject.aspectRatio } : {}) }) }} onBlur={propertyEnd} /></label>
            <label>Height<input aria-label="Object height" type="number" min="18" value={Math.round(selectedObject.height)} disabled={!!selectedObject.aspectRatio} onFocus={propertyStart} onChange={(event) => updateSelected({ height: Math.max(18, Number(event.target.value) || 18) })} onBlur={propertyEnd} /></label>
            <label>Opacity<input aria-label="Object opacity" type="range" min=".1" max="1" step=".05" value={selectedObject.opacity} onFocus={propertyStart} onPointerDown={propertyStart} onChange={(event) => updateSelected({ opacity: Number(event.target.value) })} onPointerUp={propertyEnd} onBlur={propertyEnd} /></label>
          </>}
          {(selectedObject.type === 'image' || selectedObject.type === 'signature') && <label>Rotation<input aria-label="Object rotation" type="number" min="-180" max="180" value={selectedObject.rotation} onFocus={propertyStart} onChange={(event) => updateSelected({ rotation: Number(event.target.value) || 0 })} onBlur={propertyEnd} /></label>}
          {(selectedObject.type === 'highlight' || selectedObject.type === 'shape') && <label>Color<input aria-label="Object color" type="color" value={selectedObject.type === 'highlight' ? selectedObject.color : selectedObject.strokeColor} onFocus={propertyStart} onChange={(event) => updateSelected(selectedObject.type === 'highlight' ? { color: event.target.value } : { strokeColor: event.target.value })} onBlur={propertyEnd} /></label>}
          {selectedObject.type === 'shape' && <>
            <label>Stroke width<input aria-label="Shape stroke width" type="range" min="1" max="18" value={selectedObject.strokeWidth || 2} onFocus={propertyStart} onPointerDown={propertyStart} onChange={(event) => updateSelected({ strokeWidth: Number(event.target.value) })} onPointerUp={propertyEnd} onBlur={propertyEnd} /></label>
            <label>Fill color<input aria-label="Shape fill color" type="color" value={selectedObject.fillColor || '#ffffff'} onFocus={propertyStart} onChange={(event) => updateSelected({ fillColor: event.target.value })} onBlur={propertyEnd} /></label>
            <label>Fill opacity<input aria-label="Shape fill opacity" type="range" min="0" max="1" step=".05" value={selectedObject.fillOpacity || 0} onFocus={propertyStart} onPointerDown={propertyStart} onChange={(event) => updateSelected({ fillOpacity: Number(event.target.value) })} onPointerUp={propertyEnd} onBlur={propertyEnd} /></label>
          </>}
          <button className="secondary-button" onClick={removeSelected}><Trash2 size={16} /> Delete object</button>
          {selectedObject.type === 'text' && <div className="property-row"><button aria-label="Bold" className={selectedObject.bold ? 'active' : ''} onClick={() => toggleSelected({ bold: !selectedObject.bold })}><Bold size={16} /></button><button aria-label="Italic" className={selectedObject.italic ? 'active' : ''} onClick={() => toggleSelected({ italic: !selectedObject.italic })}><Italic size={16} /></button></div>}
        </> : <p className="muted">Each mode has its own creation gesture. Select an object to move, resize, style, or delete it.</p>}
        <hr /><h3>Page actions</h3>
        <button onClick={() => pageEdit('delete')}><Trash2 size={16} /> Delete page</button><button onClick={() => pageEdit('duplicate')}><FileText size={16} /> Duplicate page</button><button onClick={() => pageEdit('blank')}><FilePlus size={16} /> Insert blank page</button><button onClick={() => setPage(Math.max(1, page - 1))}><ArrowUp size={16} /> Previous page</button><button onClick={() => setPage(Math.min(pageCount, page + 1))}><ArrowDown size={16} /> Next page</button>
        <p className="editor-note"><strong>Scope</strong><br />PDFium handles supported existing text. Other objects are local additions. Rectangles are not permanent redaction.</p><Link to="/pdf-health-check">Run PDF Health Check →</Link>
      </aside></div>
    </section>}
    {signatureOpen && <div className="editor-modal-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setSignatureOpen(false) }}><section className="signature-modal" role="dialog" aria-modal="true" aria-labelledby="signature-title"><button className="modal-close" aria-label="Close signature dialog" onClick={() => setSignatureOpen(false)}><X size={18} /></button><h2 id="signature-title">Create your signature</h2><p>Draw with a mouse, pen, or finger, or upload an image.</p><canvas ref={signatureCanvas} width="640" height="220" aria-label="Signature drawing canvas" onPointerDown={signatureDown} onPointerMove={signatureMove} onPointerUp={signatureUp} onPointerCancel={signatureUp} /><div className="signature-controls"><label>Color <input aria-label="Signature color" type="color" value={signatureColor} onChange={(event) => setSignatureColor(event.target.value)} /></label><label>Thickness <input aria-label="Signature thickness" type="range" min="1" max="12" value={signatureWidth} onChange={(event) => setSignatureWidth(Number(event.target.value))} /></label><button onClick={() => setSignatureStrokes((current) => current.slice(0, -1))}><Undo2 size={16} /> Undo stroke</button><button onClick={() => setSignatureStrokes([])}><Trash2 size={16} /> Clear</button></div><div className="signature-actions"><button className="secondary-button" onClick={() => signatureInput.current?.click()}><Upload size={16} /> Upload signature</button><button className="primary-button" onClick={addSignature}><PenLine size={16} /> Add signature</button></div></section></div>}
    <section className="editor-copy"><article><span className="kicker">Local-first workspace</span><h2>A desktop-style editor without uploading your document.</h2><p>PDFium changes supported underlying text objects; PDF.js renders pages; pdf-lib exports additions and page edits.</p></article><aside><h3>Editor FAQ</h3><details><summary>Can it edit existing text?</summary><p>Yes. PDFHope can directly edit existing text in supported text-based PDFs. The editor changes the underlying PDF text object rather than simply covering it with new text. Some PDFs, including scanned documents, outlined text, unusual font encodings, and complex PDF structures, may not support direct editing. PDFHope will tell you when direct editing is unavailable.</p></details><details><summary>Are black boxes redaction?</summary><p>No. This editor does not implement permanent redaction.</p></details></aside></section>
  </main>
}

