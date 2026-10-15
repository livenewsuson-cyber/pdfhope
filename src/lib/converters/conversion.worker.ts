/// <reference lib="webworker" />
import { openRenderedPdf } from '../pdf/render'
import { extractDocumentText } from './pdfText'
import { csvModel, decodeText, emailModel, notebookModel } from './documentModel'
import { documentPdf } from './documentPdf'

self.onmessage = async (event: MessageEvent<{ file: File; mode: string; options:{paper:'a4'|'letter';landscape:boolean;encoding:string;delimiter:string} }>) => {
  try {
    const { file, mode } = event.data
    if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('Choose a nonempty file no larger than 20 MB.')
    if(mode!=='pdf-to-txt') {
      self.postMessage({progress:'Parsing document safely…'})
      const bytes=new Uint8Array(await file.arrayBuffer()), options=event.data.options
      const model=mode==='csv-to-pdf'?csvModel(decodeText(bytes,options.encoding),options.delimiter):mode==='ipynb-to-pdf'?notebookModel(decodeText(bytes)):mode==='eml-to-pdf'||mode==='msg-to-pdf'?await emailModel(bytes,mode):null
      if(!model)throw new Error('Unsupported conversion.')
      const fonts=await Promise.all(['NotoSans-Regular.ttf','NotoSans-Bold.ttf'].map(async name=>{const response=await fetch(new URL(`/fonts/${name}`,self.location.origin));if(!response.ok)throw new Error('The local PDF font could not load. Check your connection and retry.');return new Uint8Array(await response.arrayBuffer())}))
      const result=await documentPdf(model,{paper:options.paper,landscape:options.landscape,regular:fonts[0],bold:fonts[1]},progress=>self.postMessage({progress}))
      self.postMessage({result:new Blob([result.bytes as BlobPart],{type:'application/pdf'}),pages:result.pages,warnings:result.warnings});return
    }
    const pdf = await openRenderedPdf(file)
    try {
      const result = await extractDocumentText(pdf, (page, total) => self.postMessage({ progress: `Extracting page ${page} of ${total}…` }))
      self.postMessage({ result: new Blob([result.text], { type: 'text/plain;charset=utf-8' }), pages: result.pages, warnings: result.warnings })
    } finally { await pdf.cleanup() }
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Unable to convert this file.' }) }
}
