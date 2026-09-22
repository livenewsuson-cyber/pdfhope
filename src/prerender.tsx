import { renderToReadableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App'
import { tools } from './data/tools'
import { SeoContext, webApplication, type PageSeo } from './lib/seo'

export const paths = ['/', '/tools', ...tools.map(tool => `/${tool.slug}`), ...['about', 'contact', 'privacy', 'privacy-policy', 'terms', 'cookie-policy', 'security', 'accessibility'].map(path => `/${path}`)]
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function render(path: string) {
  let page: PageSeo | undefined
  const stream = await renderToReadableStream(<SeoContext.Provider value={value => { page = value }}><StaticRouter location={path}><App/></StaticRouter></SeoContext.Provider>)
  await stream.allReady
  const body = await new Response(stream).text()
  if (!page || page.path !== path) throw new Error(`Missing route-specific metadata: ${path}`)
  const { title, description, index } = page
  const canonical = `https://pdfhope.com${path}`
  const head = `<title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <meta name="robots" content="${index ? 'index,follow' : 'noindex,follow'}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
    ${tools.some(tool => path === `/${tool.slug}`) ? `<script id="tool-structured-data" type="application/ld+json">${JSON.stringify(webApplication(page)).replace(/</g, '\\u003c')}</script>` : ''}`
  return { body, head }
}
