import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { zlibSync } from 'fflate'
import { decodeTiffPages } from './tiff'
import { writeFile, mkdir } from 'node:fs/promises'

// Real TIFF bytes, two grayscale pixels/page. No mocked decoder.
export function tiffFixture(orientations=[1], compression=1) {
  const count=11, directory=2+count*12+4, strip=compression===8?zlibSync(new Uint8Array([25,240])):new Uint8Array([25,240])
  const bytes=new Uint8Array(8+orientations.length*(directory+strip.length)),view=new DataView(bytes.buffer)
  bytes.set([73,73,42,0]);view.setUint32(4,8,true)
  orientations.forEach((orientation,index)=>{
    const start=8+index*(directory+strip.length), data=start+directory
    const entries=[[256,4,2],[257,4,1],[258,3,8],[259,3,compression],[262,3,1],[273,4,data],[274,3,orientation],[277,3,1],[278,4,1],[279,4,strip.length],[284,3,1]]
    view.setUint16(start,count,true)
    entries.forEach(([tag,type,value],n)=>{const p=start+2+n*12;view.setUint16(p,tag,true);view.setUint16(p+2,type,true);view.setUint32(p+4,1,true);if(type===3)view.setUint16(p+8,value,true);else view.setUint32(p+8,value,true)})
    view.setUint32(start+2+count*12,index<orientations.length-1?data+strip.length:0,true);bytes.set(strip,data)
  })
  return bytes
}
describe('TIFF actual decoding and PDF embedding',()=>{
  it('preserves every multipage directory in order and rotates orientation 6',async()=>{
    const pages=decodeTiffPages(tiffFixture([1,6]))
    expect(pages.map(p=>[p.width,p.height])).toEqual([[2,1],[1,2]])
    const pdf=await PDFDocument.create()
    for(const page of pages){const image=await pdf.embedPng(page.bytes);pdf.addPage([image.width,image.height]).drawImage(image,{x:0,y:0,width:image.width,height:image.height})}
    const reopened=await PDFDocument.load(await pdf.save());expect(reopened.getPageCount()).toBe(2);expect(reopened.getPage(1).getSize()).toEqual({width:1,height:2})
    if(process.env.PDFHOPE_QA_OUTPUT){await mkdir(process.env.PDFHOPE_QA_OUTPUT,{recursive:true});await writeFile(`${process.env.PDFHOPE_QA_OUTPUT}/sample.tiff`,tiffFixture([1,6]));await writeFile(`${process.env.PDFHOPE_QA_OUTPUT}/sample.png`,pages[0].bytes);await writeFile(`${process.env.PDFHOPE_QA_OUTPUT}/unsupported.tiff`,tiffFixture([1],4))}
  })
  it('decodes actual Deflate strips',()=>expect(decodeTiffPages(tiffFixture([1],8))).toHaveLength(1))
  it('rejects unsupported compression, broken files and too many pages',()=>{
    expect(()=>decodeTiffPages(tiffFixture([1],4))).toThrow('Unsupported TIFF encoding')
    expect(()=>decodeTiffPages(tiffFixture(Array(51).fill(1)))).toThrow('50 pages')
    expect(()=>decodeTiffPages(new Uint8Array([73,73]))).toThrow()
  })
})
