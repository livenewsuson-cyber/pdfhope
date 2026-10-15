import { decode } from 'tiff'
import { strToU8, zlibSync } from 'fflate'

function png(width: number, height: number, rgba: Uint8Array) {
  const concat = (parts: Uint8Array[]) => { const result = new Uint8Array(parts.reduce((n,p)=>n+p.length,0)); let offset=0; for(const p of parts){result.set(p,offset);offset+=p.length} return result }
  const chunk = (name: string, data: Uint8Array) => {
    const content=concat([strToU8(name),data]); let crc=0xffffffff
    for(const byte of content){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
    const result=new Uint8Array(data.length+12), view=new DataView(result.buffer);view.setUint32(0,data.length);result.set(content,4);view.setUint32(result.length-4,(crc^0xffffffff)>>>0);return result
  }
  const header=new Uint8Array(13), view=new DataView(header.buffer);view.setUint32(0,width);view.setUint32(4,height);header[8]=8;header[9]=6
  const scan=new Uint8Array(height*(width*4+1));for(let y=0;y<height;y++)scan.set(rgba.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1)
  return concat([new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlibSync(scan)),chunk('IEND',new Uint8Array())])
}

export function decodeTiffPages(bytes: Uint8Array) {
  if (bytes.length < 8 || bytes.length > 20*1024*1024) throw new Error('TIFF files must be nonempty and no larger than 20 MB.')
  const signature = Array.from(bytes.subarray(0,4)).join(',')
  if (!['73,73,42,0','77,77,0,42'].includes(signature)) throw new Error('Unsupported TIFF header. BigTIFF is not supported.')
  const headers = decode(bytes, { ignoreImageData:true })
  if (!headers.length || headers.length > 50) throw new Error('TIFF must have between 1 and 50 pages.')
  let pixels=0
  for (const [index,h] of headers.entries()) {
    pixels += h.width*h.height
    if (!Number.isSafeInteger(h.width) || !Number.isSafeInteger(h.height) || h.width<1 || h.height<1 || h.width*h.height>12000000 || pixels>24000000) throw new Error(`TIFF page ${index+1} exceeds the 12 MP/page or 24 MP total image limit.`)
    if (![1,5,8,32946].includes(h.compression) || ![8,16].includes(h.bitsPerSample) || ![0,1,2].includes(h.type) || ![1,2,3,4].includes(h.components) || (h.type===2?h.components<3:h.components>2) || h.sampleFormat!==1 || ![1,2,3,4,5,6,7,8].includes(h.orientation||1)) throw new Error(`Unsupported TIFF encoding on page ${index+1}. Use 8/16-bit grayscale or RGB with uncompressed, LZW or Deflate compression. CCITT/JPEG/PackBits/float/palette TIFF is not supported.`)
  }
  // The decoder accepts only orientation=1. Normalize the metadata in a private
  // copy, decode unchanged samples, then apply the original orientation below.
  const normalized=bytes.slice(), view=new DataView(normalized.buffer), little=bytes[0]===73
  let offset=view.getUint32(4,little);const seen=new Set<number>()
  while(offset){if(seen.has(offset)||seen.size>=50||offset+2>bytes.length)throw new Error('Invalid TIFF directory chain.');seen.add(offset);const count=view.getUint16(offset,little);if(offset+2+count*12+4>bytes.length)throw new Error('Truncated TIFF directory.');for(let n=0;n<count;n++){const entry=offset+2+n*12;if(view.getUint16(entry,little)===274){if(view.getUint16(entry+2,little)!==3||view.getUint32(entry+4,little)!==1)throw new Error('Invalid TIFF orientation.');view.setUint16(entry+8,1,little)}}offset=view.getUint32(offset+2+count*12,little)}
  return headers.map((header,index) => {
    const image=decode(normalized,{pages:[index]})[0], {width:w,height:h,components}=image
    if (!image || image.data.length !== w*h*components) throw new Error(`TIFF page ${index+1} could not be decoded completely.`)
    const orientation=header.orientation||1, width=orientation>=5?h:w, height=orientation>=5?w:h, out=new Uint8Array(width*height*4)
    const channel=(i:number)=>image.bitsPerSample===16?Math.round(image.data[i]/257):image.data[i]
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
      const transforms=[[x,y],[w-1-x,y],[w-1-x,h-1-y],[x,h-1-y],[y,x],[h-1-y,x],[h-1-y,w-1-x],[y,w-1-x]]
      const [dx,dy]=transforms[orientation-1], from=(y*w+x)*components,to=(dy*width+dx)*4,gray=image.type!==2
      const alpha=image.alpha?channel(from+components-1):255
      for(let c=0;c<3;c++)out[to+c]=channel(from+(gray?0:c))
      out[to+3]=alpha
    }
    return {bytes:png(width,height,out),width,height}
  })
}
