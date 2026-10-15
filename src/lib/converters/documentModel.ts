import Papa from 'papaparse'
import { Parser } from 'htmlparser2'
import { marked } from 'marked'
import PostalMime from 'postal-mime'
import MsgReader from '@kenjiuno/msgreader'

export type Run = { text: string; bold?: boolean; italic?: boolean; code?: boolean }
export type Block = { kind:'text'; runs:Run[]; size?:number; code?:boolean } | { kind:'table'; rows:string[][]; header:boolean } | { kind:'image'; bytes:Uint8Array; mime:'png'|'jpg' }
export type DocumentModel = { blocks:Block[]; warnings:string[] }
const paragraph = (text:string, bold=false):Block => ({kind:'text',runs:[{text,bold}]})
const MAX_CHARS=250000
const checkText=(text:string)=>{if(text.length>MAX_CHARS)throw new Error('Document text exceeds 250,000 characters.');return text}
const joinText=(value:unknown):string=>typeof value==='string'?value:Array.isArray(value)&&value.every(v=>typeof v==='string')?value.join(''):''

export function decodeText(bytes:Uint8Array,encoding='auto') {
  let selected=encoding
  if(selected==='auto')selected=bytes[0]===255&&bytes[1]===254?'utf-16le':bytes[0]===254&&bytes[1]===255?'utf-16be':'utf-8'
  try {return new TextDecoder(selected,{fatal:true}).decode(bytes)} catch {throw new Error('Text encoding could not be decoded. Select the source encoding explicitly (for example Windows-1252).')}
}

export function csvModel(text:string,delimiter=''):DocumentModel {
  checkText(text)
  const parsed=Papa.parse<string[]>(text,{delimiter,skipEmptyLines:'greedy',dynamicTyping:false})
  const errors=parsed.errors.filter(e=>e.code!=='UndetectableDelimiter')
  if(errors.length)throw new Error(`Invalid CSV: ${errors[0].message}`)
  const rows=parsed.data
  if(rows.length<1||rows.length>10001||rows[0].length>12||rows.some(r=>r.length!==rows[0].length))throw new Error('Use a rectangular CSV with at most 12 columns and 10,000 data rows.')
  if(rows.some(r=>r.some(c=>c.length>8000)))throw new Error('A CSV cell is too long (maximum 8,000 characters).')
  return {blocks:[{kind:'table',rows,header:true}],warnings:['CSV values are printed literally. Formula-like cells are never executed. Dates and numbers retain their original strings.']}
}

function embeddedImage(source:string,resources:Map<string,{bytes:Uint8Array;mime:string}>):Extract<Block,{kind:'image'}>|null {
  let bytes:Uint8Array,mime:string
  if(source.startsWith('cid:')){const resource=resources.get(source.slice(4).replace(/^<|>$/g,''));if(!resource)return null;({bytes,mime}=resource)}
  else {const match=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=\s]+)$/i.exec(source);if(!match||match[2].length>3000000)return null;mime=`image/${match[1].toLowerCase()}`;try{bytes=Uint8Array.from(atob(match[2].replace(/\s/g,'')),c=>c.charCodeAt(0))}catch{return null}}
  if(bytes.length>2*1024*1024||!['image/png','image/jpeg'].includes(mime))return null
  return {kind:'image',bytes,mime:mime==='image/png'?'png':'jpg'}
}

// Inert HTML parsing only. No DOM insertion, CSS, URLs, scripts, event handlers,
// network resources, attachments or notebook code are ever executed.
export function htmlModel(html:string,resources=new Map<string,{bytes:Uint8Array;mime:string}>()):DocumentModel {
  checkText(html)
  const blocks:Block[]=[],warnings=new Set<string>(), stack:string[]=[]
  const forbidden=new Set(['script','style','iframe','object','embed','svg','math','form','template','head','video','audio'])
  let runs:Run[]=[],rows:string[][]|null=null,row:string[]|null=null,cell='',depth=0,nodes=0,images=0
  const flush=()=>{if(runs.some(r=>r.text.trim()))blocks.push({kind:'text',runs,size:stack.includes('h1')?22:stack.includes('h2')?18:stack.some(s=>/^h[3-6]$/.test(s))?14:undefined,code:stack.includes('pre')});runs=[]}
  const parser=new Parser({
    onopentag(name,attrs){if(++nodes>50000||stack.length>80)throw new Error('HTML is too complex.');stack.push(name);if(forbidden.has(name)){depth++;warnings.add('Active HTML, styles and embedded objects were removed.')}if(depth)return
      if(name==='table'){flush();if(rows)throw new Error('Nested HTML tables are unsupported.');rows=[]}
      else if(name==='tr'&&rows)row=[]
      else if((name==='td'||name==='th')&&rows){cell='';if(attrs.colspan||attrs.rowspan)warnings.add('HTML table spans are flattened into separate text cells; review the table.')}
      else if(name==='img'){flush();const img=embeddedImage(attrs.src||'',resources);if(img&&++images<=30)blocks.push(img);else warnings.add('An external, unsupported or oversized image was omitted. No remote images were downloaded.')}
      else if(['p','div','h1','h2','h3','h4','h5','h6','pre','li','blockquote'].includes(name))flush()
      else if(name==='br'){if(row)cell+='\n';else runs.push({text:'\n'})}
    },
    ontext(text){if(depth)return;if(row){cell+=text;return}runs.push({text,bold:stack.some(s=>['b','strong','h1','h2','h3','h4'].includes(s)),italic:stack.some(s=>['em','i'].includes(s)),code:stack.some(s=>['code','pre'].includes(s))})},
    onclosetag(name){if(!depth){if((name==='td'||name==='th')&&row)row.push(cell.trim());else if(name==='tr'&&rows&&row){rows.push(row);row=null}else if(name==='table'&&rows){if(rows.length&&rows.some(r=>r.length>12))throw new Error('HTML tables support at most 12 columns.');if(rows.length)blocks.push({kind:'table',rows,header:true});rows=null}else if(['p','div','h1','h2','h3','h4','h5','h6','pre','li','blockquote'].includes(name))flush()}if(forbidden.has(name))depth=Math.max(0,depth-1);stack.pop()},
  },{decodeEntities:true})
  parser.write(html);parser.end();flush()
  return {blocks,warnings:[...warnings]}
}

export function notebookModel(text:string):DocumentModel {
  checkText(text)
  let value:unknown
  try{value=JSON.parse(text)}catch{throw new Error('Invalid notebook JSON.')}
  const book=value as {nbformat?:number;cells?:{cell_type?:string;source?:unknown;outputs?:{output_type?:string;text?:unknown;data?:Record<string,unknown>;ename?:string;evalue?:string}[]}[]}
  if(book.nbformat!==4||!Array.isArray(book.cells)||!book.cells.length||book.cells.length>500)throw new Error('Use a version 4 Jupyter notebook with 1–500 cells.')
  const model:DocumentModel={blocks:[],warnings:['Notebook code is printed, never run. Widgets, JavaScript, SVG, LaTeX math and remote resources are not rendered. Code uses readable plain formatting.']}
  for(const [i,cell]of book.cells.entries()){
    const source=joinText(cell.source)
    if(cell.cell_type==='markdown'){const parsed=htmlModel(marked.parse(source,{async:false}) as string);model.blocks.push(...parsed.blocks);model.warnings.push(...parsed.warnings)}
    else if(cell.cell_type==='code'){
      model.blocks.push({kind:'text',runs:[{text:`Cell ${i+1}\n${source}`,code:true}],code:true})
      for(const output of cell.outputs||[]){const data=output.data||{}
        if(data['image/png']||data['image/jpeg']){const mime=data['image/png']?'png':'jpeg',image=embeddedImage(`data:image/${mime};base64,${joinText(data[`image/${mime}`])}`,new Map());if(image)model.blocks.push(image);else model.warnings.push(`Cell ${i+1}: image omitted because it is unsupported or oversized.`)}
        else if(data['text/html']){const parsed=htmlModel(joinText(data['text/html']));model.blocks.push(...parsed.blocks);model.warnings.push(...parsed.warnings)}
        else if(output.text||data['text/plain'])model.blocks.push(paragraph(joinText(output.text||data['text/plain'])))
        else if(output.output_type==='error')model.blocks.push(paragraph(`${output.ename||'Error'}: ${output.evalue||''}`))
        else model.warnings.push(`Cell ${i+1}: unsupported rich output omitted.`)
      }
    }else if(cell.cell_type==='raw')model.blocks.push(paragraph(source))
    else throw new Error(`Unsupported notebook cell type at cell ${i+1}.`)
  }
  return model
}

export async function emailModel(bytes:Uint8Array,mode:'eml-to-pdf'|'msg-to-pdf'):Promise<DocumentModel> {
  const model:DocumentModel={blocks:[],warnings:['Email styling is simplified. External resources are blocked; attachments are listed only and are never opened.']}
  if(mode==='eml-to-pdf'){
    const parsed=await PostalMime.parse(bytes,{maxNestingDepth:30,maxPartCount:200,maxHeadersSize:256*1024,maxRfc822NestingDepth:0})
    if(!parsed.subject&&!parsed.from)throw new Error('No supported email headers found. Choose a standard MIME EML message.')
    const address=(v:unknown):string=>{if(!v||typeof v!=='object')return '';const a=v as {name?:string;address?:string;group?:unknown[]};return a.group?a.group.map(address).join(', '):`${a.name||''}${a.address?` <${a.address}>`:''}`.trim()}
    model.blocks.push(paragraph(parsed.subject||'(No subject)',true),paragraph(`From: ${address(parsed.from)}\nTo: ${(parsed.to||[]).map(address).join(', ')}\nCc: ${(parsed.cc||[]).map(address).join(', ')}\nDate: ${parsed.date||'(Not supplied)'}`))
    const resources=new Map<string,{bytes:Uint8Array;mime:string}>()
    for(const a of parsed.attachments){if(a.contentId&&typeof a.content!=='string')resources.set(a.contentId.replace(/^<|>$/g,''),{bytes:a.content instanceof Uint8Array?a.content:new Uint8Array(a.content),mime:a.mimeType})}
    if(parsed.html){const body=htmlModel(parsed.html,resources);model.blocks.push(...body.blocks);model.warnings.push(...body.warnings)}else model.blocks.push(paragraph(checkText(parsed.text||'')))
    if(parsed.attachments.length)model.blocks.push(paragraph(`Attachments (not opened):\n${parsed.attachments.map(a=>a.filename||'(unnamed attachment)').join('\n')}`))
  }else{
    if(bytes[0]!==0xd0||bytes[1]!==0xcf)throw new Error('Choose a valid Outlook MSG compound document.')
    // CJS interop differs between Node and a bundled module worker.
    const Reader=typeof MsgReader==='function'?MsgReader:(MsgReader as unknown as {default:typeof MsgReader}).default
    const reader=new Reader(bytes.slice().buffer),parsed=reader.getFileData()
    if(parsed.error||parsed.dataType!=='msg')throw new Error('Unsupported or damaged Outlook MSG structure.')
    if(!parsed.body&&!parsed.bodyHtml&&!parsed.html)throw new Error('This MSG has no supported plain text or HTML body. RTF-only/encrypted messages are unsupported.')
    model.blocks.push(paragraph(parsed.subject||'(No subject)',true),paragraph(`From: ${parsed.senderName||''} <${parsed.senderEmail||''}>\nTo: ${(parsed.recipients||[]).filter(r=>!r.recipType||r.recipType==='to').map(r=>`${r.name||''} <${r.smtpAddress||r.email||''}>`).join(', ')}\nCc: ${(parsed.recipients||[]).filter(r=>r.recipType==='cc').map(r=>r.smtpAddress||r.email||r.name||'').join(', ')}\nDate: ${parsed.messageDeliveryTime||parsed.clientSubmitTime||'(Not supplied)'}`))
    const html=parsed.bodyHtml||(parsed.html?new TextDecoder().decode(parsed.html):'')
    if(html){const body=htmlModel(html);model.blocks.push(...body.blocks);model.warnings.push(...body.warnings)}else model.blocks.push(paragraph(checkText(parsed.body||'')))
    if(parsed.attachments?.length)model.blocks.push(paragraph(`Attachments (not opened):\n${parsed.attachments.map(a=>a.fileName||a.fileNameShort||'(unnamed attachment)').join('\n')}`))
  }
  return model
}
