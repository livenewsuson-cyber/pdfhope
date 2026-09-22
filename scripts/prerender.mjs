import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

// Prerender an anonymous visitor: preferences are still read normally in the browser.
globalThis.localStorage = { getItem: () => null }
globalThis.matchMedia = () => ({ matches: false })
process.env.PDFHOPE_PLAIN_VITE = '1'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { render, paths } = await server.ssrLoadModule('/src/prerender.tsx')
  const output = resolve('dist/client')
  const template = await readFile(resolve(output, 'index.html'), 'utf8')
  if (!template.includes('<div id="root"></div>')) throw new Error('Run vite build before prerendering; the input must be the fresh app shell.')
  for (const path of [...paths, '/404']) {
    const { body, head } = await render(path)
    const html = template
      .replace(/<title>[\s\S]*?<\/title>/g, '')
      .replace(/<meta\s+(?:name="(?:description|robots|twitter:card)"|property="og:[^"]+")[^>]*>/g, '')
      .replace(/<link\s+rel="canonical"[^>]*>/g, '')
      .replace('</head>', `${head}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
    if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1) throw new Error(`Expected one H1: ${path}`)
    if ((html.match(/rel="canonical"/g) || []).length !== 1) throw new Error(`Expected one canonical: ${path}`)
    if (path !== '/' && html.includes('<link rel="canonical" href="https://pdfhope.com/"')) throw new Error(`Homepage canonical leaked into ${path}`)
    const filename = resolve(output, path === '/' ? 'index.html' : `${path.slice(1)}.html`)
    await mkdir(resolve(filename, '..'), { recursive: true })
    await writeFile(filename, html)
  }
  await writeFile(resolve(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(path => `  <url><loc>https://pdfhope.com${path}</loc></url>`).join('\n')}\n</urlset>\n`)
  console.log(`Prerendered ${paths.length} indexable routes and a noindex 404 page.`)
} finally {
  await server.close()
}
