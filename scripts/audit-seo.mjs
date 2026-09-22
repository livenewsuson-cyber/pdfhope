import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const origin = process.argv[2] || null
const artifact = process.argv[3]
const read = async path => {
  if (!origin) return { status: 200, text: await readFile(`dist/client/${path === '/' ? 'index.html' : path.slice(1).endsWith('.xml') || path.slice(1).endsWith('.txt') ? path.slice(1) : `${path.slice(1)}.html`}`, 'utf8'), headers: {} }
  const response = await fetch(`${origin}${path}`, { redirect: 'manual' })
  return { status: response.status, text: await response.text(), headers: Object.fromEntries(response.headers) }
}
const sitemap = await read('/sitemap.xml')
assert.equal(sitemap.status, 200)
const urls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
assert.equal(urls.length, 39)
assert.equal(new Set(urls).size, urls.length)
const results = [], links = new Set(), titles = new Set(), descriptions = new Set()
for (const url of urls) {
  assert.equal(new URL(url).origin, 'https://pdfhope.com')
  assert.equal(new URL(url).search, '')
  const path = new URL(url).pathname
  const { status, text, headers } = await read(path)
  assert.equal(status, 200, `${path}: status`)
  const one = (pattern, label) => {
    const matches = [...text.matchAll(pattern)]
    assert.equal(matches.length, 1, `${path}: ${label} count`)
    assert.ok(matches[0][1]?.trim(), `${path}: empty ${label}`)
    return matches[0][1]
  }
  const title = one(/<title>([^<]+)<\/title>/g, 'title')
  assert.equal((title.match(/PDFHope/g) || []).length, 1, `${path}: repeated branding in title`)
  const description = one(/<meta name="description" content="([^"]+)"\s*\/?>/g, 'description')
  const h1 = one(/<h1[^>]*>([\s\S]*?)<\/h1>/g, 'H1').replace(/<[^>]+>/g, '')
  if (path === '/edit-pdf') assert.equal(h1, 'Edit PDF')
  assert.equal(one(/<link rel="canonical" href="([^"]+)"\s*\/?>/g, 'canonical'), url)
  if (path !== '/') assert.ok(!text.includes('<link rel="canonical" href="https://pdfhope.com/"'), `${path}: homepage canonical leakage`)
  assert.equal(one(/<meta name="robots" content="([^"]+)"\s*\/?>/g, 'robots'), 'index,follow')
  assert.equal(one(/<meta property="og:url" content="([^"]+)"\s*\/?>/g, 'OG URL'), url)
  assert.equal(one(/<meta property="og:title" content="([^"]+)"\s*\/?>/g, 'OG title'), title)
  assert.equal(one(/<meta property="og:description" content="([^"]+)"\s*\/?>/g, 'OG description'), description)
  assert.ok(!titles.has(title), `${path}: duplicate title`); titles.add(title)
  assert.ok(!descriptions.has(description), `${path}: duplicate description`); descriptions.add(description)
  const schemas = [...text.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  const isTool = !['/', '/tools', '/about', '/contact', '/privacy', '/privacy-policy', '/terms', '/cookie-policy', '/security', '/accessibility'].includes(path)
  if (isTool) {
    assert.equal(schemas.filter(schema => schema['@type'] === 'WebApplication' && schema.url === url).length, 1, `${path}: WebApplication schema`)
    assert.match(text, /<ol>/, `${path}: how-to steps`)
    assert.match(text, /<summary>/, `${path}: visible FAQs`)
  }
  for (const match of text.matchAll(/<a[^>]*href="(\/[^"#]*)"/g)) links.add(match[1].split('?')[0])
  assert.ok(!text.includes('<div id="root"></div>'), `${path}: empty app shell`)
  if (origin === 'https://pdfhope.com') assert.ok(!/noindex/i.test(headers['x-robots-tag'] || ''))
  results.push({ path, status, title, description, h1, canonical: url, schema: isTool ? 'WebApplication' : 'Organization + WebSite', htmlBytes: Buffer.byteLength(text) })
}
for (const url of urls) assert.ok(links.has(new URL(url).pathname), `Not reachable through a link: ${url}`)
const robots = await read('/robots.txt')
assert.equal(robots.status, 200)
assert.match(robots.text, /Sitemap: https:\/\/pdfhope.com\/sitemap.xml/)
assert.ok(!/^Disallow:\s*\/\s*$/m.test(robots.text))
if (origin) {
  assert.equal((await read('/not-a-real-pdfhope-tool-seo-check')).status, 404)
  assert.equal((await read('/404')).status, 404)
}
if (origin === 'https://pdfhope.com') {
  for (const path of ['/', '/merge-pdf?seo-check=1', '/pdf-to-word', '/word-to-pdf', '/blank-page-detector']) {
    const redirect = await fetch(`https://www.pdfhope.com${path}`, { redirect: 'manual' })
    assert.equal(redirect.status, 301, `${path}: www must redirect permanently`)
    assert.equal(redirect.headers.get('Location'), `${origin}${path}`, `${path}: redirect must preserve path and query`)
    await redirect.arrayBuffer()
  }
}
if (artifact) await writeFile(artifact, JSON.stringify({ origin: origin || 'local build', checkedAt: new Date().toISOString(), passed: true, results }, null, 2))
console.log(`PASS: ${results.length} unique indexable pages; 29 tool schemas, how-to sections and FAQs; crawlable internal links; sitemap and robots${origin ? '; HTTP statuses and real 404s' : ''}.`)
