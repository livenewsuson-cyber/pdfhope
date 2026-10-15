import type { PDFDocumentProxy } from 'pdfjs-dist'
type TextRun = { transform: number[]; width: number; height: number; hasEOL?: boolean }

export async function extractDocumentText(pdf: PDFDocumentProxy, progress?: (page: number, total: number) => void) {
  if (pdf.numPages > 200) throw new Error('Use a PDF with at most 200 pages.')
  const pages: string[] = [], scannedPages: number[] = []
  let characters = 0
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number)
    try {
      const content = await page.getTextContent()
      if (content.items.length > 30000) throw new Error('A page contains too many text objects.')
      let text = '', previous: TextRun | undefined
      for (const entry of content.items) {
        if (!('str' in entry)) continue
        const item = entry
        // Strip nonprinting controls without altering Unicode text.
        // eslint-disable-next-line no-control-regex
        const value = item.str.replace(/[\u0000-\u0008\u000b\u000e-\u001f]/g, '')
        if (previous && value) {
          const dy = Math.abs(item.transform[5] - previous.transform[5]), size = Math.max(Math.abs(previous.height), 1)
          if (dy > size * 1.6) text += '\n\n'
          else if (dy > size * .45 || previous.hasEOL) text += '\n'
          else if (item.transform[4] - (previous.transform[4] + previous.width) > size * .12 && !/\s$/.test(text)) text += ' '
        }
        text += value; previous = item
      }
      text = text.replace(/[ \t]+\n/g, '\n').trim()
      if (!/[\p{L}\p{N}]/u.test(text)) scannedPages.push(number)
      pages.push(text)
      characters += text.length
      if (characters > 1000000) throw new Error('Extracted text exceeds one million characters. Try a smaller PDF.')
      progress?.(number, pdf.numPages)
    } finally { page.cleanup() }
  }
  if (scannedPages.length === pdf.numPages) throw new Error('No usable selectable text found. This PDF may be scanned. Use OCR PDF first.')
  return { text: pages.join('\n\n\f\n\n'), pages: pdf.numPages, warnings: scannedPages.length ? [`Pages ${scannedPages.join(', ')} contain no usable selectable text. Run OCR PDF for these pages; their text is absent from this download.`] : [] }
}
