import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

// Check the delivered blocking CSS, not just a source import that might split again.
const origin = process.argv[2]
const read = async path => origin ? (await fetch(`${origin}${path}`)).text() : readFile(`dist/client${path === '/' ? '/index.html' : path}`, 'utf8')
const html = await read('/')
const head = html.split('</head>')[0]
assert.match(html, /<main class="home-page">/)
const sheets = [...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1])
assert.ok(sheets.length, 'Missing render-blocking stylesheet')
const css = (await Promise.all(sheets.map(read))).join('\n')
assert.match(css, /\.home-page\s*>\s*\.hero\s*\{/)
assert.match(css, /min-height:\s*310px/)
assert.ok(css.lastIndexOf('.home-page>.hero') > css.indexOf('.hero{'), 'Compact cascade must follow base hero rules')
assert.match(css, /grid-template-areas:[^;}]*eyebrow[^;}]*search[^;}]*agent/)
const theme = head.match(/<script id="theme-init">([\s\S]*?)<\/script>/)?.[1]
assert.ok(theme, 'Theme must initialize before body and deferred modules')
const hash = `'sha256-${createHash('sha256').update(theme).digest('base64')}'`
const policy = origin ? (await fetch(origin)).headers.get('content-security-policy') : await readFile('dist/client/_headers', 'utf8')
assert.ok(policy?.includes(hash), 'Delivered CSP must allow exactly the theme bootstrap')
console.log(`PASS: ${origin || 'built HTML'} has compact render-blocking CSS, correct cascade and pre-paint theme with matching CSP hash.`)
