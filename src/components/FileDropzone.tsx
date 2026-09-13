import { FilePlus2, LockKeyhole } from 'lucide-react'
import { useRef, useState } from 'react'

export function FileDropzone({ accept, multiple, onFiles }:{accept:string;multiple?:boolean;onFiles:(files:File[])=>void}) {
  const input=useRef<HTMLInputElement>(null),[active,setActive]=useState(false)
  const receive=(list:FileList|null)=>{if(list?.length)onFiles(Array.from(list))}
  return <div className={`dropzone ${active?'is-active':''}`} onDragOver={(event)=>{event.preventDefault();setActive(true)}} onDragLeave={()=>setActive(false)} onDrop={(event)=>{event.preventDefault();setActive(false);receive(event.dataTransfer.files)}}>
    <input ref={input} type="file" accept={accept} multiple={multiple} onChange={(event)=>receive(event.target.files)} />
    <span className="drop-icon"><FilePlus2 size={30}/></span><h2>Drop {multiple?'files':'a file'} here</h2><p>or choose {multiple?'files':'a file'} from your device</p><button className="primary-button" onClick={()=>input.current?.click()}>Choose {multiple?'files':'file'}</button><span className="local-note"><LockKeyhole size={15}/> Processed on your device</span>
  </div>
}
