import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const template = read('index.html')
const bootstrap = template.match(/<script id="theme-init">([\s\S]*?)<\/script>/)![1]

describe('homepage first paint', () => {
  it('loads compact styles eagerly after the shared cascade, not from the lazy page', () => {
    const entry = read('src/main.tsx')
    expect(entry.indexOf("import './styles/homepage-compact.css'")).toBeGreaterThan(entry.indexOf("import './styles/brand.css'"))
    expect(read('src/pages/HomePage.tsx')).not.toContain("import '../styles/homepage-compact.css'")
    expect(read('src/styles/homepage-compact.css')).toContain('min-height: 310px')
  })

  it('selects the theme before the body without waiting for React or weakening CSP', () => {
    expect(template.indexOf('id="theme-init"')).toBeLessThan(template.indexOf('<body>'))
    const hash = createHash('sha256').update(bootstrap).digest('base64')
    expect(read('public/_headers')).toContain(`'sha256-${hash}'`)
    expect(read('public/_headers')).not.toMatch(/script-src[^;]*'unsafe-inline'/)
  })

  it.each([
    ['dark', false, 'dark'], ['light', true, 'light'],
    [null, true, 'dark'], [null, false, 'light'],
  ])('resolves saved/system theme %s / %s before paint', (saved, systemDark, expected) => {
    const dataset: Record<string, string> = {}
    runInNewContext(bootstrap, {
      localStorage: { getItem: () => saved },
      document: { documentElement: { dataset } },
      window: { matchMedia: () => ({ matches: systemDark }) },
    })
    expect(dataset.theme).toBe(expected)
  })

  it('still renders when the pre-paint storage read is denied', () => {
    const dataset: Record<string, string> = {}
    runInNewContext(bootstrap, {
      localStorage: { getItem: () => { throw new Error('Storage denied') } },
      document: { documentElement: { dataset } },
      window: { matchMedia: () => ({ matches: true }) },
    })
    expect(dataset.theme).toBe('dark')
  })
})
