import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { strToU8, zipSync } from 'fflate'
import { openRenderedPdf, renderPage } from './render'

export type PageInfo = { page: number; width: number; height: number; orientation: 'Portrait' | 'Landscape' | 'Square'; size: string }

const read = async (file: File) => new Uint8Array(await file.arrayBuffer())
const load = async (file: File) => PDFDocument.load(await read(file), { ignoreEncryption: false, updateMetadata: false })
const blob = (bytes: Uint8Array, type = 'application/pdf') => new Blob([bytes as BlobPart], { type })

export async function mergePdfs(files: File[]) {
  const output = await PDFDocument.create()
  for (const file of files) {
    const source = await load(file)
    const pages = await output.copyPages(source, source.getPageIndices())
    pages.forEach((page) => output.addPage(page))
  }
  return blob(await output.save())
}

export async function copySelectedPages(file: File, selected: number[]) {
  const source = await load(file)
  if (!selected.length) throw new Error('Select at least one page.')
  const output = await PDFDocument.create()
  const pages = await output.copyPages(source, selected)
  pages.forEach((page) => output.addPage(page))
  return blob(await output.save())
}

export async function removePages(file: File, removed: number[]) {
  const source = await load(file)
  const keep = source.getPageIndices().filter((index) => !removed.includes(index))
  if (!keep.length) throw new Error('At least one page must remain.')
  return copySelectedPages(file, keep)
}

export async function reorderPages(file: File, order: number[]) {
  const source = await load(file)
  if (order.length !== source.getPageCount() || new Set(order).size !== order.length) throw new Error('The page order is incomplete.')
  return copySelectedPages(file, order)
}

export async function rotatePages(file: File, selected: number[], angle: number) {
  const document = await load(file)
  for (const index of selected) {
    const page = document.getPage(index)
    const current = page.getRotation().angle
    page.setRotation(degrees((current + angle) % 360))
  }
  return blob(await document.save())
}

export async function splitPdf(file: File, groups: number[][]) {
  const source = await load(file)
  const entries: Record<string, Uint8Array> = {}
  for (let index = 0; index < groups.length; index += 1) {
    const output = await PDFDocument.create()
    const pages = await output.copyPages(source, groups[index])
    pages.forEach((page) => output.addPage(page))
    entries[`part-${String(index + 1).padStart(2, '0')}.pdf`] = await output.save()
  }
  return blob(zipSync(entries, { level: 6 }), 'application/zip')
}

async function imageBytes(file: File) {
  const bytes = await read(file)
  // Trust the file signature over the browser-provided MIME type. Camera and
  // messaging apps sometimes give images a misleading extension/type; passing
  // JPEG bytes to pdf-lib's PNG decoder (or vice versa) causes a generic export
  // failure. WebP still needs rasterization before embedding.
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  const isWebp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (isJpeg) return { bytes, type: 'image/jpeg' }
  if (isPng) return { bytes, type: 'image/png' }
  if (!isWebp && file.type !== 'image/webp') throw new Error('The selected file is not a supported JPG, PNG, or WebP image.')
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width; canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  const converted = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not convert WebP image.')), 'image/png'))
  return { bytes: new Uint8Array(await converted.arrayBuffer()), type: 'image/png' }
}

export async function imagesToPdf(files: File[], settings: { pageSize: 'auto' | 'a4' | 'letter'; margin: number; fit: 'fit' | 'fill' }) {
  const document = await PDFDocument.create()
  for (const file of files) {
    const source = await imageBytes(file)
    const image = source.type === 'image/png' ? await document.embedPng(source.bytes) : await document.embedJpg(source.bytes)
    const fixed = settings.pageSize === 'a4' ? [595.28, 841.89] : settings.pageSize === 'letter' ? [612, 792] : [image.width + settings.margin * 2, image.height + settings.margin * 2]
    const page = document.addPage(fixed as [number, number])
    const available = { width: page.getWidth() - settings.margin * 2, height: page.getHeight() - settings.margin * 2 }
    const scale = settings.fit === 'fill' ? Math.max(available.width / image.width, available.height / image.height) : Math.min(available.width / image.width, available.height / image.height)
    const width = image.width * scale, height = image.height * scale
    page.drawImage(image, { x: (page.getWidth() - width) / 2, y: (page.getHeight() - height) / 2, width, height })
  }
  return blob(await document.save())
}

export async function addPageNumbers(file: File, options: { selected: number[]; start: number; size: number; position: string; prefix: string }) {
  const document = await load(file)
  const font = await document.embedFont(StandardFonts.Helvetica)
  options.selected.forEach((pageIndex, sequence) => {
    const page = document.getPage(pageIndex), text = `${options.prefix}${options.start + sequence}`, margin = 28
    const textWidth = font.widthOfTextAtSize(text, options.size)
    const x = options.position.includes('left') ? margin : options.position.includes('right') ? page.getWidth() - textWidth - margin : (page.getWidth() - textWidth) / 2
    const y = options.position.includes('top') ? page.getHeight() - options.size - margin : margin
    page.drawText(text, { x, y, size: options.size, font, color: rgb(.08, .12, .17) })
  })
  return blob(await document.save())
}

export async function addWatermark(file: File, options: { selected: number[]; text: string; size: number; angle: number; opacity: number }) {
  const document = await load(file), font = await document.embedFont(StandardFonts.HelveticaBold)
  options.selected.forEach((index) => {
    const page = document.getPage(index), width = font.widthOfTextAtSize(options.text, options.size)
    page.drawText(options.text, { x:(page.getWidth() - width) / 2, y:page.getHeight() / 2, size:options.size, font, rotate:degrees(options.angle), opacity:options.opacity, color:rgb(.05,.45,.42) })
  })
  return blob(await document.save())
}

export async function cleanMetadata(file: File) {
  const document = await load(file)
  const before = { title:document.getTitle() || '', author:document.getAuthor() || '', subject:document.getSubject() || '', keywords:document.getKeywords() || '', creator:document.getCreator() || '', producer:document.getProducer() || '' }
  document.setTitle(''); document.setAuthor(''); document.setSubject(''); document.setKeywords([]); document.setCreator(''); document.setProducer('')
  return { output:blob(await document.save()), report:{ removed:Object.entries(before).filter(([, value]) => value).map(([key]) => key), retained:'Page content, attachments, annotations, and custom embedded data were not inspected.' } }
}

export function namePageSize(width: number, height: number) {
  const portrait = [Math.min(width, height), Math.max(width, height)]
  const known: [string, number, number][] = [['A4',595.28,841.89],['Letter',612,792],['Legal',612,1008],['A3',841.89,1190.55]]
  return known.find(([, w, h]) => Math.abs(portrait[0] - w) < 5 && Math.abs(portrait[1] - h) < 5)?.[0] ?? 'Custom'
}

export async function inspectPdf(file: File) {
  const document = await load(file)
  const pages: PageInfo[] = document.getPages().map((page, index) => {
    const { width, height } = page.getSize(), rotated = page.getRotation().angle % 180 !== 0
    const effectiveWidth = rotated ? height : width, effectiveHeight = rotated ? width : height
    return { page:index + 1, width:Number(effectiveWidth.toFixed(1)), height:Number(effectiveHeight.toFixed(1)), orientation:Math.abs(effectiveWidth-effectiveHeight)<1?'Square':effectiveWidth>effectiveHeight?'Landscape':'Portrait', size:namePageSize(effectiveWidth,effectiveHeight) }
  })
  return {
    fileName:file.name, fileSize:file.size, pageCount:document.getPageCount(), pages,
    metadata:{ title:document.getTitle() || null, author:document.getAuthor() || null, subject:document.getSubject() || null, keywords:document.getKeywords() || null, creator:document.getCreator() || null, producer:document.getProducer() || null },
    encrypted:document.isEncrypted,
  }
}

export async function interleavePdfs(files: File[]) {
  if (files.length !== 2) throw new Error('Choose exactly two PDFs.')
  const [a,b] = await Promise.all(files.map(load)), output = await PDFDocument.create(), max = Math.max(a.getPageCount(), b.getPageCount())
  for (let index=0; index<max; index+=1) for (const source of [a,b]) if (index < source.getPageCount()) output.addPage((await output.copyPages(source,[index]))[0])
  return blob(await output.save())
}

export async function deinterleavePdf(file: File) {
  const source = await load(file), entries:Record<string,Uint8Array> = {}
  for (const [name, parity] of [['odd-pages.pdf',0],['even-pages.pdf',1]] as const) {
    const output=await PDFDocument.create(), indices=source.getPageIndices().filter((index)=>index%2===parity)
    const pages=await output.copyPages(source,indices); pages.forEach((page)=>output.addPage(page)); entries[name]=await output.save()
  }
  return blob(zipSync(entries,{level:6}),'application/zip')
}

export async function nUpPdf(file: File, perSheet: 2|4, landscape: boolean) {
  const source=await load(file), output=await PDFDocument.create(), sheet=landscape?[841.89,595.28]:[595.28,841.89], cols=perSheet===2?1:2, rows=2, margin=24, gap=12
  const slots=source.getPageIndices()
  for(let start=0;start<slots.length;start+=perSheet){ const page=output.addPage(sheet as [number,number]); const chunk=slots.slice(start,start+perSheet); const embedded=await output.embedPages(chunk.map((index)=>source.getPage(index))); embedded.forEach((item,index)=>{const col=index%cols,row=Math.floor(index/cols),cellW=(sheet[0]-margin*2-gap*(cols-1))/cols,cellH=(sheet[1]-margin*2-gap*(rows-1))/rows,scale=Math.min(cellW/item.width,cellH/item.height),w=item.width*scale,h=item.height*scale,x=margin+col*(cellW+gap)+(cellW-w)/2,y=sheet[1]-margin-(row+1)*cellH-row*gap+(cellH-h)/2;page.drawPage(item,{x,y,width:w,height:h})}) }
  return blob(await output.save())
}

export async function contactSheetPdf(file: File, columns: 2|3|4) {
  const source=await openRenderedPdf(file), output=await PDFDocument.create(), sheet:[number,number]=[595.28,841.89], margin=28, gap=12, rows=columns===2?3:columns===3?4:5, perSheet=columns*rows, cellW=(sheet[0]-margin*2-gap*(columns-1))/columns, cellH=(sheet[1]-margin*2-gap*(rows-1))/rows
  try {
    for(let start=1;start<=source.numPages;start+=perSheet){ const page=output.addPage(sheet); const count=Math.min(perSheet,source.numPages-start+1); for(let offset=0;offset<count;offset+=1){ const number=start+offset,canvas=await renderPage(source,number,.3),image=await output.embedJpg(await new Promise<Uint8Array>((resolve,reject)=>canvas.toBlob(async(value)=>value?resolve(new Uint8Array(await value.arrayBuffer())):reject(new Error('Thumbnail rendering failed.')),'image/jpeg',.78)));const col=offset%columns,row=Math.floor(offset/columns),label=18,scale=Math.min(cellW/image.width,(cellH-label)/image.height),w=image.width*scale,h=image.height*scale,x=margin+col*(cellW+gap)+(cellW-w)/2,y=sheet[1]-margin-(row+1)*cellH-row*gap+label+(cellH-label-h)/2;page.drawImage(image,{x,y,width:w,height:h});page.drawText(`Page ${number}`,{x:margin+col*(cellW+gap),y:sheet[1]-margin-(row+1)*cellH-row*gap+3,size:8,color:rgb(.25,.3,.34)}) } }
  } finally { await source.cleanup() }
  return blob(await output.save())
}

export const jsonBlob = (data: unknown) => new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
export const textZip = (entries: Record<string, string>) => blob(zipSync(Object.fromEntries(Object.entries(entries).map(([name,value])=>[name,strToU8(value)]))), 'application/zip')
