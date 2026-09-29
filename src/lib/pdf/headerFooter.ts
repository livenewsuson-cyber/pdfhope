import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib'
import { parsePageSelection, safeBaseName } from '../files'

export type HeaderFooterAlignment = 'left' | 'center' | 'right'
export type HeaderFooterFont = 'Helvetica' | 'Times Roman' | 'Courier'
export type HeaderFooterStyle = 'regular' | 'bold' | 'italic'
export type HeaderFooterOptions = {
  header: boolean; headerText: string; headerAlignment: HeaderFooterAlignment
  footer: boolean; footerText: string; footerAlignment: HeaderFooterAlignment
  font: HeaderFooterFont; style: HeaderFooterStyle; size: number; color: string
  topMargin: number; bottomMargin: number; range: string; skipFirst: boolean
}

const fonts: Record<HeaderFooterFont, Record<HeaderFooterStyle, StandardFonts>> = {
  Helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold, italic: StandardFonts.HelveticaOblique },
  'Times Roman': { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold, italic: StandardFonts.TimesRomanItalic },
  Courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold, italic: StandardFonts.CourierOblique },
}

export const defaultHeaderFooterOptions: HeaderFooterOptions = {
  header: true, headerText: '{date}', headerAlignment: 'right',
  footer: true, footerText: 'Page {page} of {pages}', footerAlignment: 'center',
  font: 'Helvetica', style: 'regular', size: 10, color: '#26364d',
  topMargin: 24, bottomMargin: 24, range: '', skipFirst: false,
}

export function resolveHeaderFooterText(template: string, page: number, pages: number, date: Date) {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return template.replace(/\{(page|pages|date)\}/g, (_, token: string) => token === 'page' ? String(page) : token === 'pages' ? String(pages) : stamp)
}

export function selectedHeaderFooterPages(range: string, pageCount: number, skipFirst: boolean) {
  return parsePageSelection(range, pageCount).filter(index => !skipFirst || index !== 0)
}

export function headerFooterPlacement(pageWidth: number, pageHeight: number, rotation: number, textWidth: number, size: number, alignment: HeaderFooterAlignment, edge: 'top' | 'bottom', margin: number) {
  const turn = ((rotation % 360) + 360) % 360
  if (![0, 90, 180, 270].includes(turn)) throw new Error('This PDF uses an unsupported page rotation.')
  const visualWidth = turn % 180 ? pageHeight : pageWidth
  const visualHeight = turn % 180 ? pageWidth : pageHeight
  const safeMargin = Math.max(8, Math.min(margin, visualHeight - size - 8))
  const inset = 18
  if (textWidth > visualWidth - inset * 2) throw new Error('Header or footer text is too long for this page. Shorten it or reduce the font size.')
  const visualX = alignment === 'left' ? inset : alignment === 'right' ? visualWidth - inset - textWidth : (visualWidth - textWidth) / 2
  const visualY = edge === 'top' ? visualHeight - safeMargin - size : safeMargin
  if (turn === 90) return { x: pageWidth - visualY, y: visualX, rotate: 90 }
  if (turn === 180) return { x: pageWidth - visualX, y: pageHeight - visualY, rotate: 180 }
  if (turn === 270) return { x: visualY, y: pageHeight - visualX, rotate: 270 }
  return { x: visualX, y: visualY, rotate: 0 }
}

export const headerFooterFilename = (name: string) => `${safeBaseName(name)}-header-footer.pdf`

function colorFromHex(value: string) {
  if (!/^#[\da-f]{6}$/i.test(value)) throw new Error('Choose a valid text color.')
  return rgb(...([1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16) / 255) as [number, number, number]))
}

export async function addHeaderFooterPdf(file: File, options: HeaderFooterOptions, date = new Date()) {
  if ((!options.header || !options.headerText.trim()) && (!options.footer || !options.footerText.trim())) throw new Error('Enable a header or footer and enter its text.')
  if (!Number.isFinite(options.size) || options.size < 8 || options.size > 24) throw new Error('Font size must be between 8 and 24 pt.')
  const document = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false, updateMetadata: false })
  const font: PDFFont = await document.embedFont(fonts[options.font][options.style])
  const color = colorFromHex(options.color)
  const count = document.getPageCount()
  const selected = selectedHeaderFooterPages(options.range, count, options.skipFirst)
  if (!selected.length) throw new Error('No pages remain after applying the page range and skip-first setting.')
  for (const index of selected) {
    const page = document.getPage(index)
    const { width, height } = page.getSize()
    const rotation = page.getRotation().angle
    for (const [enabled, template, alignment, edge, margin] of [
      [options.header, options.headerText, options.headerAlignment, 'top', options.topMargin],
      [options.footer, options.footerText, options.footerAlignment, 'bottom', options.bottomMargin],
    ] as const) {
      if (!enabled || !template.trim()) continue
      const text = resolveHeaderFooterText(template, index + 1, count, date)
      const location = headerFooterPlacement(width, height, rotation, font.widthOfTextAtSize(text, options.size), options.size, alignment, edge, margin)
      page.drawText(text, { x: location.x, y: location.y, size: options.size, font, color, rotate: degrees(location.rotate) })
    }
  }
  return new Blob([await document.save({ useObjectStreams: true }) as BlobPart], { type: 'application/pdf' })
}
