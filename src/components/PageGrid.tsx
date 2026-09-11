import { GripVertical, X } from 'lucide-react'

export function PageGrid({ pages, selected, onSelected, order, onOrder }:{pages:number;selected:number[];onSelected?:(value:number[])=>void;order?:number[];onOrder?:(value:number[])=>void}) {
  const list=order??Array.from({length:pages},(_,index)=>index)
  const toggle=(page:number)=>onSelected?.(selected.includes(page)?selected.filter((value)=>value!==page):[...selected,page])
  const drop=(from:number,to:number)=>{if(!onOrder)return;const next=[...list],item=next.splice(from,1)[0];next.splice(to,0,item);onOrder(next)}
  return <div className="page-grid" aria-label="PDF pages">{list.map((page,position)=><button key={`${page}-${position}`} type="button" draggable={Boolean(onOrder)} onDragStart={(event)=>event.dataTransfer.setData('text/plain',String(position))} onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>drop(Number(event.dataTransfer.getData('text/plain')),position)} className={`page-tile ${selected.includes(page)?'selected':''}`} onClick={()=>toggle(page)}><span className="page-paper"><span>{page+1}</span></span><small>{onOrder&&<GripVertical size={14}/>} Page {page+1}</small>{selected.includes(page)&&onSelected&&<X className="select-x" size={13}/>}</button>)}</div>
}
