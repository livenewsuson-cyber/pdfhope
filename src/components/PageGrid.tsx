import { GripVertical, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { openRenderedPdf, renderPage } from '../lib/pdf/render'

export function PageGrid({ file, pages, selected, onSelected, order, onOrder }:{file:File;pages:number;selected:number[];onSelected?:(value:number[])=>void;order?:number[];onOrder?:(value:number[])=>void}) {
  const [thumbs,setThumbs]=useState<Record<number,string>>({})
  useEffect(()=>{let active=true;const run=async()=>{const pdf=await openRenderedPdf(file);try{for(let number=1;number<=Math.min(pdf.numPages,150)&&active;number+=1){const canvas=await renderPage(pdf,number,.18);if(active)setThumbs((current)=>({...current,[number-1]:canvas.toDataURL('image/jpeg',.72)}))}}finally{await pdf.cleanup()}};void run().catch(()=>undefined);return()=>{active=false}},[file])
  const list=order??Array.from({length:pages},(_,index)=>index)
  const toggle=(page:number)=>onSelected?.(selected.includes(page)?selected.filter((value)=>value!==page):[...selected,page])
  const drop=(from:number,to:number)=>{if(!onOrder)return;const next=[...list],item=next.splice(from,1)[0];next.splice(to,0,item);onOrder(next)}
  return <div className="page-grid" aria-label="PDF pages">{list.map((page,position)=><button key={`${page}-${position}`} type="button" draggable={Boolean(onOrder)} onDragStart={(event)=>event.dataTransfer.setData('text/plain',String(position))} onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>drop(Number(event.dataTransfer.getData('text/plain')),position)} className={`page-tile ${selected.includes(page)?'selected':''}`} onClick={()=>toggle(page)}><span className="page-paper">{thumbs[page]?<img src={thumbs[page]} alt="" loading="lazy"/>:<span>{page+1}</span>}</span><small>{onOrder&&<GripVertical size={14}/>} Page {page+1}</small>{selected.includes(page)&&onSelected&&<X className="select-x" size={13}/>}</button>)}</div>
}
