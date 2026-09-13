import type { PDFDocumentProxy } from 'pdfjs-dist'

let configured = false

async function pdfjs() {
  const module = await import('pdfjs-dist')
  if (!configured) {
    module.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    configured = true
  }
  return module
}

export async function openRenderedPdf(file: File): Promise<PDFDocumentProxy> {
  const module = await pdfjs()
  return module.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useWorkerFetch: false }).promise
}

export async function renderPage(document: PDFDocumentProxy, pageNumber: number, scale = .28) {
  const page = await document.getPage(pageNumber), viewport = page.getViewport({ scale })
  const canvas = documentOwner().createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(viewport.width)); canvas.height = Math.max(1, Math.ceil(viewport.height))
  await page.render({ canvas, canvasContext:canvas.getContext('2d')!, viewport }).promise
  return canvas
}

const documentOwner = () => window.document

export async function renderPdfPages(file: File, options: { pages: number[]; format: 'jpeg'|'png'; quality:number; scale:number }) {
  const document = await openRenderedPdf(file), results: { name:string; bytes:Uint8Array }[]=[]
  try {
    for(const index of options.pages){ const canvas=await renderPage(document,index+1,options.scale); const mime=options.format==='jpeg'?'image/jpeg':'image/png'; const output=await new Promise<Blob>((resolve,reject)=>canvas.toBlob((value)=>value?resolve(value):reject(new Error('Image rendering failed.')),mime,options.quality)); results.push({name:`page-${String(index+1).padStart(3,'0')}.${options.format==='jpeg'?'jpg':'png'}`,bytes:new Uint8Array(await output.arrayBuffer())}) }
  } finally { await document.cleanup() }
  return results
}

function averageHash(data: Uint8ClampedArray) {
  const values:number[]=[]
  for(let index=0;index<data.length;index+=4) values.push(data[index]*.299+data[index+1]*.587+data[index+2]*.114)
  const average=values.reduce((sum,value)=>sum+value,0)/values.length
  return values.map((value)=>value>=average?'1':'0').join('')
}

export function hashSimilarity(a:string,b:string){ if(!a.length||a.length!==b.length)return 0;let same=0; for(let index=0;index<a.length;index+=1) if(a[index]===b[index]) same+=1; return same/a.length }
export const isLikelyBlank=(blankScore:number,textItems:number)=>blankScore>.992&&textItems===0

export async function visualAnalysis(file: File) {
  const document=await openRenderedPdf(file), pages:{page:number;blankScore:number;hash:string;textItems:number;dataUrl:string}[]=[]
  try {
    for(let number=1;number<=document.numPages;number+=1){ const page=await document.getPage(number), text=await page.getTextContent(), canvas=await renderPage(document,number,.16); const context=canvas.getContext('2d')!, pixels=context.getImageData(0,0,canvas.width,canvas.height).data; let dark=0; for(let index=0;index<pixels.length;index+=4){ const luminance=pixels[index]*.299+pixels[index+1]*.587+pixels[index+2]*.114; if(luminance<245) dark+=1 } const small=documentOwner().createElement('canvas');small.width=16;small.height=16;small.getContext('2d')!.drawImage(canvas,0,0,16,16);pages.push({page:number,blankScore:1-dark/(pixels.length/4),hash:averageHash(small.getContext('2d')!.getImageData(0,0,16,16).data),textItems:text.items.length,dataUrl:canvas.toDataURL('image/jpeg',.72)}) }
  } finally { await document.cleanup() }
  const duplicates:{a:number;b:number;similarity:number}[]=[]
  for(let a=0;a<pages.length;a+=1) for(let b=a+1;b<pages.length;b+=1){const similarity=hashSimilarity(pages[a].hash,pages[b].hash);if(similarity>=.94)duplicates.push({a:a+1,b:b+1,similarity:Number(similarity.toFixed(3))})}
  return { pages, duplicates, blankCandidates:pages.filter((page)=>isLikelyBlank(page.blankScore,page.textItems)).map((page)=>page.page) }
}
