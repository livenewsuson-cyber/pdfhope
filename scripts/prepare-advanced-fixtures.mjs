// Synthetic public QA inputs only. No private documents or credentials.
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
const directory='tmp/advanced-qa'
await mkdir(directory,{recursive:true})
await writeFile(`${directory}/sample.csv`,'Identifier,Amount,Note\n001,1250.50,"Café, first row"\n002,0,"=SUM(A1:A9)"\n003,-12.25,Final row')
await writeFile(`${directory}/sample.eml`,['From: Sender <sender@example.test>','To: Reader <reader@example.test>','Subject: Example email','Date: Thu, 15 Oct 2026 10:00:00 +0000','MIME-Version: 1.0','Content-Type: text/html; charset=utf-8','','<h1>Email heading</h1><p>Hello <b>reader</b>.</p><img src="https://tracker.invalid/pixel"><script>throw new Error("should never run")</script>'].join('\r\n'))
await writeFile(`${directory}/sample.ipynb`,JSON.stringify({nbformat:4,nbformat_minor:5,metadata:{},cells:[{cell_type:'markdown',source:['# Notebook report\n\n**Important** saved results.\n\n| Item | Amount |\n| --- | --- |\n| A | 12 |'],metadata:{}},{cell_type:'code',execution_count:1,metadata:{},source:['print("not executed")'],outputs:[{output_type:'stream',name:'stdout',text:['Saved result: 42\n']}]}]}))
const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit)
const font=await pdf.embedFont(await readFile('public/fonts/NotoSans-Regular.ttf'),{subset:true})
pdf.addPage([595,842]).drawText('First page: Café Ελληνικά Привет',{x:40,y:760,size:16,font})
pdf.addPage([595,842]).drawText('Second page: selectable text',{x:40,y:760,size:16,font})
await writeFile(`${directory}/sample.pdf`,await pdf.save())
const empty=await PDFDocument.create();empty.addPage();await writeFile(`${directory}/empty.pdf`,await empty.save())
const large=await PDFDocument.create(),simple=await large.embedFont(StandardFonts.Helvetica)
large.setTitle('Metadata '.repeat(2000));large.setAuthor('Example Author')
for(let p=0;p<3;p++){const page=large.addPage([595,842]);for(let row=0;row<35;row++)page.drawText(`Page ${p+1} row ${row+1} - ordinary selectable text`,{x:40,y:780-row*20,size:11,font:simple})}
await writeFile(`${directory}/text-heavy.pdf`,await large.save({useObjectStreams:false}))
await writeFile(`${directory}/invalid.pdf`,'%PDF-invalid')
await writeFile(`${directory}/invalid.csv`,'a,b\n"unterminated')
await writeFile(`${directory}/oversized.csv`,'x'.repeat(21*1024*1024))
console.log('Synthetic advanced feature input fixtures prepared.')
