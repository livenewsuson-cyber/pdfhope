/// <reference lib="webworker" />
import { decodeTiffPages } from './tiff'
self.onmessage = (event: MessageEvent<Uint8Array>) => {
  try { const pages=decodeTiffPages(event.data); self.postMessage({pages}, { transfer:pages.map(p=>p.bytes.buffer) }) }
  catch(error){self.postMessage({error:error instanceof Error?error.message:'Unsupported or damaged TIFF.'})}
}
