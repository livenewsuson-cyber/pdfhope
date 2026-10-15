import { PDFDocument, rgb, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { Block, DocumentModel, Run } from './documentModel'

export async function documentPdf(model:DocumentModel,options:{paper:'a4'|'letter';landscape:boolean;regular:Uint8Array;bold:Uint8Array},progress?:(message:string)=>void) {
  if(model.blocks.length>20000)throw new Error('Too many document blocks.')
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit)
  const regular=await pdf.embedFont(options.regular,{subset:true}),bold=await pdf.embedFont(options.bold,{subset:true})
  const allowed=new Set(regular.getCharacterSet()), margin=36
  const base=options.paper==='letter'?[612,792]:[595.28,841.89], dimensions=(options.landscape?[base[1],base[0]]:base) as [number,number]
  const width=dimensions[0]-margin*2, bottom=42
  let page=pdf.addPage(dimensions),y=dimensions[1]-margin,totalChars=0,totalImagePixels=0,visible=0
  const clean=(text:string)=>{
    // eslint-disable-next-line no-control-regex
    const value=text.replace(/\r\n?/g,'\n').replace(/\t/g,'    ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')
    for(const char of value)if(char!=='\n'&&!allowed.has(char.codePointAt(0)!))throw new Error(`The PDF font cannot render ${JSON.stringify(char)}. Remove unsupported characters or use a source with Latin, Greek or Cyrillic text.`)
    return value
  }
  const nextPage=()=>{if(pdf.getPageCount()>=200)throw new Error('Output exceeds 200 pages.');page=pdf.addPage(dimensions);y=dimensions[1]-margin;progress?.(`Laying out page ${pdf.getPageCount()}…`)}
  const ensure=(height:number)=>{if(y-height<bottom)nextPage()}
  const drawLine=(tokens:{text:string;font:PDFFont;size:number;color?:ReturnType<typeof rgb>}[],x:number,lineHeight:number,background=false)=>{
    ensure(lineHeight);if(background)page.drawRectangle({x:margin-3,y:y-lineHeight+2,width:width+6,height:lineHeight,color:rgb(.95,.96,.98)})
    // Keep compatible words in one PDF text object for reliable text copying.
    const merged:typeof tokens=[]
    for(const token of tokens){const previous=merged.at(-1);if(previous&&previous.font===token.font&&previous.size===token.size&&JSON.stringify(previous.color)===JSON.stringify(token.color))previous.text+=token.text;else merged.push({...token})}
    for(const token of merged){if(token.text.trim())visible++;page.drawText(token.text,{x,y:y-token.size,font:token.font,size:token.size,color:token.color||rgb(.08,.12,.18)});x+=token.font.widthOfTextAtSize(token.text,token.size)}y-=lineHeight
  }
  const wrapped=(runs:Run[],size:number)=>{
    const lines:{text:string;font:PDFFont;size:number;color?:ReturnType<typeof rgb>}[][]=[[]];let used=0
    for(const run of runs){const font=run.bold?bold:regular
      for(const word of clean(run.text).split(/(\n|[^\S\n]+)/)){
        if(!word)continue;if(word==='\n'){lines.push([]);used=0;continue}
        // Split long tokens by code point, so URLs/code and Unicode do not clip.
        const tokens=font.widthOfTextAtSize(word,size)>width?[...word]:[word]
        for(const text of tokens){const span=font.widthOfTextAtSize(text,size);if(used+span>width&&used){lines.push([]);used=0}if(!used&&/^ +$/.test(text))continue;lines.at(-1)!.push({text,font,size,color:run.code?rgb(.16,.26,.45):undefined});used+=span}
      }
    }
    return lines
  }
  const table=(block:Extract<Block,{kind:'table'}>)=>{
    const rows=block.rows, columns=Math.max(...rows.map(r=>r.length));if(!columns||columns>12||rows.length>10001)throw new Error('Table dimensions exceed supported limits.')
    const size=columns>8?8:9, lineHeight=size*1.4,padding=5
    const weights=Array.from({length:columns},(_,c)=>Math.min(35,Math.max(6,...rows.slice(0,100).map(r=>(r[c]||'').length))))
    const sum=weights.reduce((a,b)=>a+b,0),min=36,remaining=width-columns*min
    const widths=weights.map(w=>min+Math.max(0,remaining)*w/sum)
    const cellLines=(value:string,col:number)=>{
      const lines:string[]=[''];for(const part of clean(value).split(/(\n)/)){if(part==='\n'){lines.push('');continue}for(const char of part){if(regular.widthOfTextAtSize(lines.at(-1)!+char,size)>widths[col]-padding*2)lines.push('');lines[lines.length-1]+=char}}return lines
    }
    const drawRow=(row:string[],header:boolean)=>{
      const cells=Array.from({length:columns},(_,c)=>cellLines(row[c]||'',c)),count=Math.max(...cells.map(c=>c.length))
      let offset=0
      while(offset<count){
        if(y-(lineHeight+padding*2)<bottom){nextPage();if(block.header&&!header)drawRow(rows[0],true)}
        const take=Math.min(count-offset,Math.max(1,Math.floor((y-bottom-padding*2)/lineHeight))),height=take*lineHeight+padding*2
        let x=margin
        cells.forEach((lines,c)=>{page.drawRectangle({x,y:y-height,width:widths[c],height,color:header?rgb(.91,.94,.98):rgb(1,1,1),borderColor:rgb(.82,.85,.89),borderWidth:.5});for(let line=0;line<take;line++){const text=lines[offset+line]||'';if(text.trim())visible++;page.drawText(text,{x:x+padding,y:y-padding-size-line*lineHeight,size,font:header?bold:regular,color:rgb(.08,.12,.18)})}x+=widths[c]});y-=height;offset+=take
        if(offset<count){nextPage();if(block.header&&!header)drawRow(rows[0],true)}
      }
    }
    rows.forEach((row,i)=>drawRow(row,block.header&&i===0));y-=12
  }
  for(const block of model.blocks){
    if(block.kind==='text'){totalChars+=block.runs.reduce((n,r)=>n+r.text.length,0);if(totalChars>250000)throw new Error('Text exceeds 250,000 characters.');const size=block.size||10;for(const line of wrapped(block.runs,size))drawLine(line,margin,size*1.5,block.code);y-=8}
    else if(block.kind==='table'){totalChars+=block.rows.reduce((n,r)=>n+r.join('').length,0);if(totalChars>250000)throw new Error('Text exceeds 250,000 characters.');table(block)}
    else{
      // Bound image dimensions BEFORE pdf-lib expands compressed PNG data.
      let w=0,h=0
      if(block.mime==='png'){if(block.bytes.length<24||block.bytes[0]!==137||block.bytes[1]!==80)throw new Error('Invalid PNG image.');const v=new DataView(block.bytes.buffer,block.bytes.byteOffset,block.bytes.byteLength);w=v.getUint32(16);h=v.getUint32(20)}
      else{let at=2;const v=new DataView(block.bytes.buffer,block.bytes.byteOffset,block.bytes.byteLength);while(at+8<block.bytes.length){if(block.bytes[at]!==255)break;const marker=block.bytes[at+1],length=v.getUint16(at+2);if([0xc0,0xc1,0xc2].includes(marker)){h=v.getUint16(at+5);w=v.getUint16(at+7);break}if(length<2)break;at+=2+length}}
      totalImagePixels+=w*h;if(!w||!h||w*h>12000000||totalImagePixels>24000000)throw new Error('Embedded images exceed supported dimensions (12 MP each, 24 MP total).')
      const image=block.mime==='png'?await pdf.embedPng(block.bytes):await pdf.embedJpg(block.bytes),scale=Math.min(1,width/image.width,(dimensions[1]-margin-bottom)/image.height),dw=image.width*scale,dh=image.height*scale
      ensure(dh+12);page.drawImage(image,{x:margin,y:y-dh,width:dw,height:dh});y-=dh+12;visible++
    }
  }
  if(!visible)throw new Error('No supported readable content found. No PDF was created.')
  for(const [i,p]of pdf.getPages().entries())p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:margin,y:20,size:8,font:regular,color:rgb(.4,.45,.5)})
  const bytes=await pdf.save();if(bytes.length>30*1024*1024)throw new Error('Generated PDF exceeds 30 MB.')
  const verify=await PDFDocument.load(bytes);if(verify.getPageCount()!==pdf.getPageCount())throw new Error('PDF output verification failed.')
  return {bytes,pages:pdf.getPageCount(),warnings:[...new Set(model.warnings)]}
}
