import { describe, expect, it } from 'vitest'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import * as CFB from 'cfb'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { csvModel, decodeText, emailModel, htmlModel, notebookModel, type DocumentModel } from './documentModel'
import { documentPdf } from './documentPdf'
import { extractDocumentText } from './pdfText'

const fonts=Promise.all(['Regular','Bold'].map(name=>readFile(new URL(`../../../public/fonts/NotoSans-${name}.ttf`,import.meta.url))))
async function output(model:DocumentModel,name:string,landscape=false){
  const [regular,bold]=await fonts,result=await documentPdf(model,{regular,bold,paper:'a4',landscape})
  const pdf=await pdfjs.getDocument({data:result.bytes.slice()}).promise
  try{const text=await extractDocumentText(pdf);if(process.env.PDFHOPE_QA_OUTPUT){await mkdir(process.env.PDFHOPE_QA_OUTPUT,{recursive:true});await writeFile(`${process.env.PDFHOPE_QA_OUTPUT}/${name}.pdf`,result.bytes)}return {...result,text:text.text}}
  finally{await pdf.cleanup()}
}
describe('real local document conversion',()=>{
  it('prints a long CSV with repeated headers, final records, literal formulas and identifiers',async()=>{
    const csv='Identifier,Revenue,Note\n'+Array.from({length:140},(_,i)=>`ID-${String(i).padStart(3,'0')},${i}.50,"${i===0?'=SUM(A1:A9)':'Café record '+i}"`).join('\n')
    const result=await output(csvModel(csv),'csv',true)
    expect(result.pages).toBeGreaterThan(1);expect(result.text).toContain('ID-139');expect(result.text).toContain('=SUM(A1:A9)');expect(result.text.match(/Identifier/g)!.length).toBe(result.pages)
  })
  it('detects semicolons and preserves explicit legacy encoding',()=>{
    expect(csvModel('Name;Value\nCafé;001').blocks[0]).toMatchObject({rows:[['Name','Value'],['Café','001']]})
    expect(decodeText(new Uint8Array([67,97,102,233]),'windows-1252')).toBe('Café')
    expect(()=>decodeText(new Uint8Array([255,255]),'utf-8')).toThrow('encoding')
    expect(()=>csvModel('a,b\n"bad')).toThrow('Invalid CSV')
    expect(()=>csvModel('a,b\n1,2,3')).toThrow('rectangular')
  })
  it('sanitizes active HTML and remote images before producing a readable PDF',async()=>{
    const model=htmlModel('<h1>Report</h1><script>SECRET_CODE()</script><iframe src="https://example.test"></iframe><p>Hello <strong>reader</strong>.</p><img src="https://tracker.example/pixel"><table><tr><th>Item</th><th>Value</th></tr><tr><td>Apples</td><td>12</td></tr></table>')
    const result=await output(model,'safe-html')
    expect(result.text).toContain('Report');expect(result.text).toContain('Apples');expect(result.text).not.toContain('SECRET_CODE');expect(result.warnings.join(' ')).toContain('external')
  })
  it('exports ordered notebook Markdown, code and saved output without running code',async()=>{
    const json=JSON.stringify({nbformat:4,cells:[{cell_type:'markdown',source:['# Notebook title\n\n**Important** introduction.\n\n| Item | Value |\n| --- | --- |\n| A | 2 |']},{cell_type:'code',source:['print("never executed")'],outputs:[{output_type:'stream',text:['Saved output 42\n']}]}]})
    const result=await output(notebookModel(json),'notebook')
    expect(result.text.indexOf('Notebook title')).toBeLessThan(result.text.indexOf('never executed'));expect(result.text).toContain('Saved output 42');expect(result.text).toContain('Important')
    expect(()=>notebookModel('{bad')).toThrow('Invalid notebook');expect(()=>notebookModel('{"nbformat":3}')).toThrow('version 4')
    expect(()=>notebookModel('null')).toThrow('version 4');expect(()=>notebookModel('{"nbformat":4,"cells":[null]}')).toThrow('cell 1')
  })
  it('parses actual multipart MIME headers, encoded subject and attachment filenames',async()=>{
    const eml=['From: Sender <sender@example.test>','To: Reader <reader@example.test>','Subject: =?UTF-8?B?Q2Fmw6kgdXBkYXRl?=','Date: Thu, 15 Oct 2026 10:00:00 +0000','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="mix"','','--mix','Content-Type: text/html; charset=utf-8','','<p>Message body</p><img src="https://track.example/test">','--mix','Content-Type: text/plain','Content-Disposition: attachment; filename="notes.txt"','','not executed','--mix--'].join('\r\n')
    const result=await output(await emailModel(new TextEncoder().encode(eml),'eml-to-pdf'),'email')
    expect(result.text).toContain('Café update');expect(result.text).toContain('sender@example.test');expect(result.text).toContain('notes.txt');expect(result.text).not.toContain('not executed')
  })
  it('parses an actual synthetic MSG compound file with the maintained reader',async()=>{
    const cfb=CFB.utils.cfb_new({root:'Root Entry'})
    CFB.utils.cfb_add(cfb,'__properties_version1.0',new Uint8Array(32))
    for(const [tag,text]of [['0037','MSG subject'],['1000','Hello from a real MSG fixture.'],['0C1A','Example Sender'],['0C1F','sender@example.test']])CFB.utils.cfb_add(cfb,`__substg1.0_${tag}001F`,Buffer.from(text+'\0','utf16le'))
    const bytes=new Uint8Array(CFB.write(cfb,{type:'buffer'})),model=await emailModel(bytes,'msg-to-pdf'),result=await output(model,'outlook')
    expect(result.text).toContain('MSG subject');expect(result.text).toContain('real MSG fixture')
    if(process.env.PDFHOPE_QA_OUTPUT)await writeFile(`${process.env.PDFHOPE_QA_OUTPUT}/sample.msg`,bytes)
    await expect(emailModel(new Uint8Array([1,2,3]),'msg-to-pdf')).rejects.toThrow('valid Outlook')
  })
  it('rejects unsupported font glyphs and empty models instead of blank successful PDFs',async()=>{
    await expect(output({blocks:[],warnings:[]},'empty')).rejects.toThrow('No supported')
    await expect(output({blocks:[{kind:'text',runs:[{text:'漢字'}]}],warnings:[]},'unsupported')).rejects.toThrow('font cannot render')
  })
  it('preserves supported saved notebook images and MIME CID images',async()=>{
    const png='iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGOQlJT8/+HDh/8AEIAFGsDROuMAAAAASUVORK5CYII='
    const book=notebookModel(JSON.stringify({nbformat:4,cells:[{cell_type:'markdown',source:'## Figure'},{cell_type:'code',source:'saved figure',outputs:[{output_type:'display_data',data:{'image/png':png}}]}]}))
    expect(book.blocks.filter(b=>b.kind==='image')).toHaveLength(1)
    expect((await output(book,'notebook-image')).pages).toBe(1)
    const eml=['From: sender@example.test','Subject: Inline figure','MIME-Version: 1.0','Content-Type: multipart/related; boundary="inline"','','--inline','Content-Type: text/html','','<p>Embedded figure</p><img src="cid:figure">','--inline','Content-Type: image/png','Content-ID: <figure>','Content-Transfer-Encoding: base64','',png,'--inline--'].join('\r\n')
    const email=await emailModel(new TextEncoder().encode(eml),'eml-to-pdf')
    expect(email.blocks.filter(b=>b.kind==='image')).toHaveLength(1)
    expect((await output(email,'email-image')).pages).toBe(1)
  })
  it('preserves real MSG HTML, recipient and attachment metadata safely',async()=>{
    const cfb=CFB.utils.cfb_new({root:'Root Entry'})
    CFB.utils.cfb_add(cfb,'__properties_version1.0',new Uint8Array(32))
    for(const [path,text]of [['__substg1.0_0037001F','HTML message'],['__substg1.0_1013001F','<p>MSG HTML body</p><script>UNSAFE_CONTENT</script>'],['__recip_version1.0_#00000000/__substg1.0_3001001F','Recipient Name'],['__recip_version1.0_#00000000/__substg1.0_39FE001F','reader@example.test'],['__attach_version1.0_#00000000/__substg1.0_3707001F','report.pdf']])CFB.utils.cfb_add(cfb,path,Buffer.from(text+'\0','utf16le'))
    const model=await emailModel(new Uint8Array(CFB.write(cfb,{type:'buffer'})),'msg-to-pdf'),result=await output(model,'msg-html')
    expect(result.text).toContain('MSG HTML body');expect(result.text).toContain('reader@example.test');expect(result.text).toContain('report.pdf');expect(result.text).not.toContain('UNSAFE_CONTENT')
  })
})
