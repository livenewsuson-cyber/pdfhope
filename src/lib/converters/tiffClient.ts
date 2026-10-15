export async function tiffImages(file: File, signal?: AbortSignal): Promise<{bytes:Uint8Array;type:string}[]> {
  const data=new Uint8Array(await file.arrayBuffer());signal?.throwIfAborted()
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./tiff.worker.ts',import.meta.url),{type:'module'})
    const finish=(error?:Error,pages?:{bytes:Uint8Array}[])=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();if(error)reject(error);else resolve(pages!.map(p=>({...p,type:'image/png'})))}
    const abort=()=>finish(new Error('Image conversion cancelled.'))
    const timer=setTimeout(()=>finish(new Error('TIFF decoding exceeded 30 seconds. Try a smaller file.')),30000)
    signal?.addEventListener('abort',abort,{once:true})
    worker.onerror=()=>finish(new Error('TIFF decoding failed. Try a smaller supported image.'))
    worker.onmessage=(event:MessageEvent<{pages?:{bytes:Uint8Array}[];error?:string}>)=>finish(event.data.error?new Error(event.data.error):undefined,event.data.pages)
    worker.postMessage(data,[data.buffer])
  })
}
