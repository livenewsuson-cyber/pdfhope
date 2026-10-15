/// <reference lib="webworker" />
import { openRenderedPdf } from '../pdf/render'
import { extractDocumentText } from './pdfText'

self.onmessage = async (event: MessageEvent<{ file: File; mode: string }>) => {
  try {
    const { file, mode } = event.data
    if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('Choose a nonempty file no larger than 20 MB.')
    if (mode !== 'pdf-to-txt') throw new Error('Unsupported conversion.')
    const pdf = await openRenderedPdf(file)
    try {
      const result = await extractDocumentText(pdf, (page, total) => self.postMessage({ progress: `Extracting page ${page} of ${total}…` }))
      self.postMessage({ result: new Blob([result.text], { type: 'text/plain;charset=utf-8' }), pages: result.pages, warnings: result.warnings })
    } finally { await pdf.cleanup() }
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Unable to convert this file.' }) }
}
