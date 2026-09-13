import { useEffect } from 'react'

export function useSeo(title: string, description: string, path: string, index = true, exactTitle = false) {
  useEffect(() => {
    document.title = exactTitle ? title : `${title} | PDFHope`
    const setMeta = (name: string, content: string, property = false) => { const selector=property?`meta[property="${name}"]`:`meta[name="${name}"]`; let element=document.head.querySelector<HTMLMetaElement>(selector); if(!element){element=document.createElement('meta');element.setAttribute(property?'property':'name',name);document.head.appendChild(element)}element.content=content }
    setMeta('description',description);setMeta('robots',index?'index,follow':'noindex,follow');setMeta('og:title',exactTitle?title:`${title} | PDFHope`,true);setMeta('og:description',description,true);setMeta('og:type','website',true);setMeta('og:url',`https://pdfhope.com${path}`,true);setMeta('twitter:card','summary')
    let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=`https://pdfhope.com${path}`
    return () => { document.title='PDFHope — Every PDF tool you need' }
  },[title,description,path,index,exactTitle])
}
