import { useContext, useEffect } from 'react'
import { SeoContext, webApplication } from '../lib/seo'
import { getTool } from '../data/tools'

export function useSeo(title: string, description: string, path: string, index = true, exactTitle = false) {
  const seoTitle = exactTitle || title.includes('PDFHope') ? title : `${title} | PDFHope`
  const collect = useContext(SeoContext)
  collect?.({ title: seoTitle, description, path, index })
  useEffect(() => {
    document.title = seoTitle
    const setMeta = (name: string, content: string, property = false) => { const selector=property?`meta[property="${name}"]`:`meta[name="${name}"]`; let element=document.head.querySelector<HTMLMetaElement>(selector); if(!element){element=document.createElement('meta');element.setAttribute(property?'property':'name',name);document.head.appendChild(element)}element.content=content }
    setMeta('description',description);setMeta('robots',index?'index,follow':'noindex,follow');setMeta('og:title',seoTitle,true);setMeta('og:description',description,true);setMeta('og:type','website',true);setMeta('og:url',`https://pdfhope.com${path}`,true);setMeta('twitter:card','summary')
    let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=`https://pdfhope.com${path}`
    document.getElementById('tool-structured-data')?.remove()
    if (getTool(path.slice(1))) {
      const schema = document.createElement('script')
      schema.id = 'tool-structured-data'; schema.type = 'application/ld+json'
      schema.textContent = JSON.stringify(webApplication({title: seoTitle, description, path, index}))
      document.head.appendChild(schema)
    }
    return () => { document.title='PDFHope — Every PDF tool you need' }
  },[seoTitle,description,path,index])
}
