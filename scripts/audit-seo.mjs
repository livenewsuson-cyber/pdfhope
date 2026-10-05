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
const toolSlugs = [...(await readFile('src/data/tools.ts', 'utf8')).matchAll(/\bslug:'([^']+)'/g)].map(match => match[1])
const categoryPaths = [...(await readFile('src/data/categoryHubs.ts', 'utf8')).matchAll(/\bpath:\s*'([^']+)'/g)].map(match => match[1])
const guideSource = `${await readFile('src/data/guides.ts', 'utf8')}\n${await readFile('src/data/guideBatch2.ts', 'utf8')}`
const guideSlugs = [...guideSource.matchAll(/\n\s+slug: '([^']+)'/g)].map(match => match[1])
const guidePaths = ['/guides', ...guideSlugs.map(slug => `/guides/${slug}`)]
assert.equal(categoryPaths.length, 7, 'Expected seven category hubs')
assert.ok(guideSlugs.length > 0, 'Expected guides in the guide registry')
assert.equal(new Set(guideSlugs).size, guideSlugs.length, 'Guide slugs must be unique')
const expectedRoutes = toolSlugs.length + categoryPaths.length + guidePaths.length + 10 // homepage, catalog, guides, and eight information pages
assert.equal(urls.length, expectedRoutes)
for (const slug of toolSlugs) assert.ok(urls.includes(`https://pdfhope.com/${slug}`), `Missing tool route: ${slug}`)
for (const path of categoryPaths) assert.ok(urls.includes(`https://pdfhope.com${path}`), `Missing category route: ${path}`)
for (const path of guidePaths) assert.ok(urls.includes(`https://pdfhope.com${path}`), `Missing guide route: ${path}`)
assert.equal(new Set(urls).size, urls.length)
const results = [], links = new Set(), titles = new Set(), descriptions = new Set(), guideH1s = new Set(), guideIntros = new Set(), htmlByPath = new Map(), toolCategories = new Map(), guidePrimaryTools = new Map()
for (const url of urls) {
  assert.equal(new URL(url).origin, 'https://pdfhope.com')
  assert.equal(new URL(url).search, '')
  const path = new URL(url).pathname
  const { status, text, headers } = await read(path)
  assert.equal(status, 200, `${path}: status`)
  htmlByPath.set(path, text)
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
  for (const [tool, heading] of Object.entries({ '/extract-pdf-pages': 'Extract PDF Pages', '/delete-pdf-pages': 'Delete PDF Pages', '/reorder-pdf': 'Reorder PDF Pages' })) if (path === tool) assert.equal(h1, heading)
  assert.equal(one(/<link rel="canonical" href="([^"]+)"\s*\/?>/g, 'canonical'), url)
  if (path !== '/') assert.ok(!text.includes('<link rel="canonical" href="https://pdfhope.com/"'), `${path}: homepage canonical leakage`)
  assert.equal(one(/<meta name="robots" content="([^"]+)"\s*\/?>/g, 'robots'), 'index,follow')
  assert.equal(one(/<meta property="og:url" content="([^"]+)"\s*\/?>/g, 'OG URL'), url)
  assert.equal(one(/<meta property="og:title" content="([^"]+)"\s*\/?>/g, 'OG title'), title)
  assert.equal(one(/<meta property="og:description" content="([^"]+)"\s*\/?>/g, 'OG description'), description)
  assert.ok(!titles.has(title), `${path}: duplicate title`); titles.add(title)
  assert.ok(!descriptions.has(description), `${path}: duplicate description`); descriptions.add(description)
  const schemas = [...text.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  const isTool = toolSlugs.includes(path.slice(1)), isCategory = categoryPaths.includes(path), isGuideIndex = path === '/guides', isGuide = guidePaths.slice(1).includes(path)
  const breadcrumbs = schemas.filter(schema => schema['@type'] === 'BreadcrumbList')
  if (isTool || isCategory || isGuideIndex || isGuide) {
    assert.equal(breadcrumbs.length, 1, `${path}: exactly one BreadcrumbList schema`)
    const items = breadcrumbs[0].itemListElement
    assert.equal(items.length, isTool ? 4 : isCategory || isGuide ? 3 : 2, `${path}: breadcrumb depth`)
    assert.deepEqual(items.map(item => item.position), items.map((_, index) => index + 1), `${path}: breadcrumb positions`)
    assert.equal(items[0].item, 'https://pdfhope.com/')
    assert.equal(items[1].item, isGuideIndex || isGuide ? 'https://pdfhope.com/guides' : 'https://pdfhope.com/tools')
    assert.equal(items.at(-1).item, url, `${path}: final breadcrumb URL`)
    const visible = text.match(/<nav[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
    assert.ok(visible, `${path}: visible breadcrumb`)
    for (const item of items.slice(0, -1)) assert.ok(visible.includes(`href="${new URL(item.item).pathname}"`), `${path}: missing visible ancestor ${item.item}`)
    if (isTool) {
      const categoryPath = new URL(items[2].item).pathname
      assert.ok(categoryPaths.includes(categoryPath), `${path}: invalid category breadcrumb`)
      toolCategories.set(path, categoryPath)
    }
  } else assert.equal(breadcrumbs.length, 0, `${path}: unexpected breadcrumb schema`)
  if (isTool) {
    assert.equal(schemas.filter(schema => schema['@type'] === 'WebApplication' && schema.url === url).length, 1, `${path}: WebApplication schema`)
    assert.match(text, /<ol>/, `${path}: how-to steps`)
    assert.match(text, /<summary>/, `${path}: visible FAQs`)
    assert.ok(!text.includes('How to use this PDF tool'), `${path}: generic how-to heading`)
  }
  if (isCategory) {
    assert.equal(schemas.filter(schema => schema['@type'] === 'CollectionPage' && schema.url === url).length, 1, `${path}: CollectionPage schema`)
    assert.match(text, /How to choose the right tool/, `${path}: choosing guidance`)
    assert.match(text, /Common use cases/, `${path}: use cases`)
    assert.match(text, /<summary>/, `${path}: visible FAQs`)
    assert.ok(Buffer.byteLength(text) > 6500, `${path}: insufficient rendered category content`)
  }
  if (isGuideIndex) {
    assert.equal(schemas.filter(schema => schema['@type'] === 'CollectionPage' && schema.url === url).length, 1, `${path}: CollectionPage schema`)
    for (const guidePath of guidePaths.slice(1)) assert.ok(text.includes(`href="${guidePath}"`), `${path}: guide card link ${guidePath}`)
  }
  if (isGuide) {
    const articles = schemas.filter(schema => schema['@type'] === 'Article' && schema.url === url)
    assert.equal(articles.length, 1, `${path}: Article schema`)
    assert.equal(articles[0].mainEntityOfPage['@id'], url, `${path}: Article mainEntityOfPage`)
    assert.equal(articles[0].publisher.name, 'PDFHope', `${path}: truthful organization publisher`)
    assert.match(text, /Short answer/, `${path}: answer-first block`)
    assert.match(text, /Frequently asked questions/, `${path}: visible FAQ`)
    assert.ok(Buffer.byteLength(text) > 14000, `${path}: insufficient rendered guide content`)
    assert.ok(!guideH1s.has(h1), `${path}: duplicate guide H1`); guideH1s.add(h1)
    const intro = one(/<p class="guide-lede">([\s\S]*?)<\/p>/g, 'guide intro').replace(/<[^>]+>/g, '')
    assert.ok(!guideIntros.has(intro), `${path}: duplicate guide intro`); guideIntros.add(intro)
    const primaryPaths = one(/data-primary-paths="([^"]+)"/g, 'primary tool paths').split(',')
    assert.ok(primaryPaths.length >= 1, `${path}: primary tool path`)
    for (const primaryPath of primaryPaths) {
      assert.ok(toolSlugs.includes(primaryPath.slice(1)), `${path}: unknown primary tool ${primaryPath}`)
      assert.ok(text.includes(`data-primary-tool="true" href="${primaryPath}"`), `${path}: visible primary CTA ${primaryPath}`)
    }
    guidePrimaryTools.set(path, primaryPaths)
  }
  for (const match of text.matchAll(/<a[^>]*href="(\/[^"#]*)"/g)) links.add(match[1].split('?')[0])
  assert.ok(!text.includes('<div id="root"></div>'), `${path}: empty app shell`)
  if (origin === 'https://pdfhope.com') assert.ok(!/noindex/i.test(headers['x-robots-tag'] || ''))
  results.push({ path, status, title, description, h1, canonical: url, schema: isTool ? 'WebApplication' : 'Organization + WebSite', htmlBytes: Buffer.byteLength(text) })
}
for (const url of urls) assert.ok(links.has(new URL(url).pathname), `Not reachable through a link: ${url}`)
for (const path of categoryPaths) {
  assert.ok(htmlByPath.get('/')?.includes(`href="${path}"`), `${path}: homepage category link`)
  assert.ok(htmlByPath.get('/tools')?.includes(`href="${path}"`), `${path}: catalog category link`)
}
for (const [toolPath, categoryPath] of toolCategories) {
  assert.ok(htmlByPath.get('/tools')?.includes(`href="${toolPath}"`), `${toolPath}: catalog tool link`)
  assert.ok(htmlByPath.get(categoryPath)?.includes(`href="${toolPath}"`), `${toolPath}: category tool link`)
}
for (const [guidePath, primaryPaths] of guidePrimaryTools) {
  const guideTitle = htmlByPath.get(guidePath)?.match(/<title>([^<]+)<\/title>/)?.[1]
  for (const toolPath of primaryPaths) {
    const toolHtml = htmlByPath.get(toolPath)
    assert.ok(toolHtml?.includes(`href="${guidePath}"`), `${toolPath}: contextual guide link ${guidePath}`)
    assert.notEqual(toolHtml?.match(/<title>([^<]+)<\/title>/)?.[1], guideTitle, `${guidePath}: tool and guide titles must differ`)
  }
}
const categoryGuideLinks = {
  '/pdf-analysis-tools': ['/guides/make-scanned-pdf-searchable'],
  '/optimize-pdf': ['/guides/compress-pdf-without-losing-searchable-text'],
  '/pdf-converters': ['/guides/pdf-to-word-formatting-changes', '/guides/pdf-to-excel', '/guides/pdf-to-powerpoint'],
  '/organize-pdf': ['/guides/merge-pdf'],
  '/pdf-security-tools': ['/guides/pdf-password-security'],
}
for (const [categoryPath, linkedGuides] of Object.entries(categoryGuideLinks)) {
  for (const guidePath of linkedGuides) assert.ok(htmlByPath.get(categoryPath)?.includes(`href="${guidePath}"`), `${categoryPath}: guide link ${guidePath}`)
}
const robots = await read('/robots.txt')
assert.equal(robots.status, 200)
assert.match(robots.text, /Sitemap: https:\/\/pdfhope.com\/sitemap.xml/)
assert.ok(!/^Disallow:\s*\/\s*$/m.test(robots.text))
assert.match(robots.text, /^Disallow: \/api\/$/m)
assert.match(robots.text, /^Disallow: \/404$/m)
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
console.log(`PASS: ${results.length} unique indexable pages; ${categoryPaths.length} category hubs, ${guideSlugs.length} guides, ${toolSlugs.length} tool schemas, breadcrumbs, crawlable internal links, sitemap and robots${origin ? '; HTTP statuses and real 404s' : ''}.`)
