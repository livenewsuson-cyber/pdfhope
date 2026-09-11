import type { WrappedPdfiumModule } from '@embedpdf/pdfium'

export type PdfiumTextObject = {
  pageIndex: number
  objectIndex: number
  handle: number
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontName: string
  color: string
  supported: boolean
}

type Bounds = { left: number; bottom: number; right: number; top: number }

let modulePromise: Promise<WrappedPdfiumModule> | null = null

async function loadModule() {
  if (!modulePromise) {
    modulePromise = (async () => {
      const { init } = await import('@embedpdf/pdfium')
      const wasmUrl = new URL('@embedpdf/pdfium/pdfium.wasm', import.meta.url).href
      const response = await fetch(wasmUrl)
      if (!response.ok) throw new Error(`Unable to load PDFium (${response.status})`)
      const wasmBinary = await response.arrayBuffer()
      const pdfium = await init({ wasmBinary })
      pdfium.PDFiumExt_Init()
      return pdfium
    })()
  }
  return modulePromise
}

function readText(pdfium: WrappedPdfiumModule, textObject: number, textPage: number) {
  const bytes = pdfium.FPDFTextObj_GetText(textObject, textPage, 0, 0)
  if (!bytes) return ''
  const ptr = pdfium.pdfium.wasmExports.malloc(bytes)
  try {
    if (!pdfium.FPDFTextObj_GetText(textObject, textPage, ptr, bytes)) return ''
    return pdfium.pdfium.UTF16ToString(ptr)
  } finally {
    pdfium.pdfium.wasmExports.free(ptr)
  }
}

function readBounds(pdfium: WrappedPdfiumModule, object: number): Bounds | null {
  const ptr = pdfium.pdfium.wasmExports.malloc(16)
  try {
    if (!pdfium.FPDFPageObj_GetBounds(object, ptr, ptr + 4, ptr + 8, ptr + 12)) return null
    const view = new DataView(((pdfium.pdfium as any).HEAPU8 as Uint8Array).buffer, ptr, 16)
    return { left: view.getFloat32(0, true), bottom: view.getFloat32(4, true), right: view.getFloat32(8, true), top: view.getFloat32(12, true) }
  } finally {
    pdfium.pdfium.wasmExports.free(ptr)
  }
}

function readColor(pdfium: WrappedPdfiumModule, object: number) {
  void pdfium
  void object
  return '#143b36'
}

function readFontName(pdfium: WrappedPdfiumModule, font: number) {
  if (!font) return 'Unknown'
  const size = 256
  const ptr = pdfium.pdfium.wasmExports.malloc(size)
  try {
    const length = pdfium.FPDFFont_GetBaseFontName(font, ptr, size)
    return length ? pdfium.pdfium.UTF8ToString(ptr) : 'Unknown'
  } finally {
    pdfium.pdfium.wasmExports.free(ptr)
  }
}

function writeUtf16(pdfium: WrappedPdfiumModule, value: string) {
  const bytes = (value.length + 1) * 2
  const ptr = pdfium.pdfium.wasmExports.malloc(bytes)
  const heap = (pdfium.pdfium as any).HEAPU8 as Uint8Array
  const view = new Uint16Array(heap.buffer, ptr, value.length + 1)
  for (let index = 0; index < value.length; index += 1) view[index] = value.charCodeAt(index)
  view[value.length] = 0
  return { ptr, bytes }
}

export class PdfiumDocument {
  private readonly pdfium: WrappedPdfiumModule
  private readonly document: number
  private readonly input: number
  private constructor(pdfium: WrappedPdfiumModule, document: number, input: number) {
    this.pdfium = pdfium
    this.document = document
    this.input = input
  }

  static async load(bytes: Uint8Array) {
    const pdfium = await loadModule()
    const input = pdfium.pdfium.wasmExports.malloc(bytes.length)
    ;((pdfium.pdfium as any).HEAPU8 as Uint8Array).set(bytes, input)
    const document = pdfium.FPDF_LoadMemDocument(input, bytes.length, '')
    if (!document) {
      const error = pdfium.FPDF_GetLastError()
      pdfium.pdfium.wasmExports.free(input)
      const reason = error === 4 ? 'password-protected' : error === 3 ? 'corrupted or unsupported' : 'unsupported'
      throw new Error(`PDFium could not open this PDF (${reason})`)
    }
    return new PdfiumDocument(pdfium, document, input)
  }

  get pageCount() { return this.pdfium.FPDF_GetPageCount(this.document) }

  listTextObjects(pageIndex: number): PdfiumTextObject[] {
    const page = this.pdfium.FPDF_LoadPage(this.document, pageIndex)
    if (!page) return []
    const textPage = this.pdfium.FPDFText_LoadPage(page)
    if (!textPage) { this.pdfium.FPDF_ClosePage(page); return [] }
    try {
      const count = this.pdfium.FPDFText_CountChars(textPage)
      const objects = new Map<number, PdfiumTextObject>()
      for (let charIndex = 0; charIndex < count; charIndex += 1) {
        const object = this.pdfium.FPDFText_GetTextObject(textPage, charIndex)
        if (!object || objects.has(object)) continue
        const bounds = readBounds(this.pdfium, object)
        const text = readText(this.pdfium, object, textPage)
        if (!bounds || !text.trim()) continue
        const sizePtr = this.pdfium.pdfium.wasmExports.malloc(4)
        const sizeView = new DataView(((this.pdfium.pdfium as any).HEAPU8 as Uint8Array).buffer, sizePtr, 4)
        this.pdfium.FPDFTextObj_GetFontSize(object, sizePtr)
        const fontSize = sizeView.getFloat32(0, true)
        this.pdfium.pdfium.wasmExports.free(sizePtr)
        const font = this.pdfium.FPDFTextObj_GetFont(object)
        let objectIndex = -1
        const pageObjectCount = this.pdfium.FPDFPage_CountObjects(page)
        for (let index = 0; index < pageObjectCount; index += 1) if (this.pdfium.FPDFPage_GetObject(page, index) === object) { objectIndex = index; break }
        if (objectIndex < 0) continue
        objects.set(object, { pageIndex, objectIndex, handle: object, text, x: bounds.left, y: bounds.bottom, width: bounds.right - bounds.left, height: bounds.top - bounds.bottom, fontSize: fontSize || 12, fontName: readFontName(this.pdfium, font), color: readColor(this.pdfium, object), supported: !this.pdfium.FPDFText_HasUnicodeMapError(textPage, charIndex) })
      }
      return [...objects.values()]
    } finally {
      this.pdfium.FPDFText_ClosePage(textPage)
      this.pdfium.FPDF_ClosePage(page)
    }
  }

  replaceTextObject(target: PdfiumTextObject, replacement: string) {
    if (!target.supported) throw new Error('This text cannot be edited directly because of how this PDF stores its content.')
    const { ptr } = writeUtf16(this.pdfium, replacement)
    const page = this.pdfium.FPDF_LoadPage(this.document, target.pageIndex)
    if (!page) { this.pdfium.pdfium.wasmExports.free(ptr); throw new Error('The PDF page could not be loaded.') }
    try {
      const object = this.pdfium.FPDFPage_GetObject(page, target.objectIndex)
      if (!object || !this.pdfium.FPDFText_SetText(object, ptr)) throw new Error('PDFium could not replace this text object.')
      if (!this.pdfium.FPDFPage_GenerateContent(page)) throw new Error('PDFium could not regenerate this page content.')
    } finally {
      this.pdfium.FPDF_ClosePage(page)
      this.pdfium.pdfium.wasmExports.free(ptr)
    }
  }

  async save() {
    const writer = this.pdfium.PDFiumExt_OpenFileWriter()
    if (!writer) throw new Error('PDFium could not create an output buffer.')
    try {
      if (!this.pdfium.PDFiumExt_SaveAsCopy(this.document, writer)) throw new Error('PDFium could not save the modified PDF.')
      const size = this.pdfium.PDFiumExt_GetFileWriterSize(writer)
      const ptr = this.pdfium.pdfium.wasmExports.malloc(size)
      try {
        this.pdfium.PDFiumExt_GetFileWriterData(writer, ptr, size)
        return ((this.pdfium.pdfium as any).HEAPU8 as Uint8Array).slice(ptr, ptr + size)
      } finally { this.pdfium.pdfium.wasmExports.free(ptr) }
    } finally { this.pdfium.PDFiumExt_CloseFileWriter(writer) }
  }

  close() {
    this.pdfium.FPDF_CloseDocument(this.document)
    this.pdfium.pdfium.wasmExports.free(this.input)
  }
}

export async function loadPdfiumDocument(bytes: Uint8Array) { return PdfiumDocument.load(bytes) }

