import { useContext, useEffect } from 'react'
import { SeoContext, articleSchema, collectionPage, webApplication } from '../lib/seo'
import { getTool } from '../data/tools'
import { breadcrumbSchema } from '../lib/breadcrumbs'

export function useSeo(title: string, description: string, path: string, index = true, exactTitle = false) {
  const seoTitle = exactTitle || title.includes('PDFHope') ? title : `${title} | PDFHope`
  const collect = useContext(SeoContext)
  collect?.({ title: seoTitle, description, path, index })
  useEffect(() => {
    document.title = seoTitle
    const setMeta = (name: string, content: string, property = false) => { const selector=property?`meta[property="${name}"]`:`meta[name="${name}"]`; let element=document.head.querySelector<HTMLMetaElement>(selector); if(!element){element=document.createElement('meta');element.setAttribute(property?'property':'name',name);document.head.appendChild(element)}element.content=content }
    setMeta('description',description);setMeta('robots',index?'index,follow':'noindex,follow');setMeta('og:title',seoTitle,true);setMeta('og:description',description,true);setMeta('og:type',articleSchema({ title: seoTitle, description, path, index })?'article':'website',true);setMeta('og:url',`https://pdfhope.com${path}`,true);setMeta('twitter:card','summary')
    let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=`https://pdfhope.com${path}`
    const page = { title: seoTitle, description, path, index }
    const addSchema = (id: string, value: object | null) => {
      document.getElementById(id)?.remove()
      if (!value) return
      const script = document.createElement('script')
      script.id = id; script.type = 'application/ld+json'; script.textContent = JSON.stringify(value)
      document.head.appendChild(script)
    }
    addSchema('tool-structured-data', getTool(path.slice(1)) ? webApplication(page) : null)
    addSchema('category-structured-data', collectionPage(page))
    addSchema('article-structured-data', articleSchema(page))
    addSchema('breadcrumb-structured-data', breadcrumbSchema(path))
    return () => { document.title='PDFHope — Every PDF tool you need' }
  },[seoTitle,description,path,index])
}
