import { describe, expect, it } from 'vitest'
import { getTool } from './tools'
import { breadcrumbItems, breadcrumbSchema } from '../lib/breadcrumbs'
import { articleSchema, collectionPage } from '../lib/seo'
import { guideByPath, guidePaths, guides } from './guides'
import { paths as prerenderPaths } from '../prerender'

describe('guide SEO architecture', () => {
  it('contains exactly three unique complete guides', () => {
    expect(guides).toHaveLength(3)
    expect(new Set(guides.map((guide) => guide.slug)).size).toBe(3)
    expect(new Set(guides.map((guide) => guide.title)).size).toBe(3)
    expect(new Set(guides.map((guide) => guide.description)).size).toBe(3)
  })

  it('uses existing tools for every primary and related link', () => {
    for (const guide of guides) {
      expect(guide.primaryTool.path).toMatch(/^\/[a-z0-9-]+$/)
      expect(getTool(guide.primaryTool.path.slice(1))).toBeTruthy()
      expect(guide.relatedTools.length).toBeGreaterThanOrEqual(2)
      for (const related of guide.relatedTools) expect(getTool(related.path.slice(1))).toBeTruthy()
    }
  })

  it('provides valid guide breadcrumbs and schemas', () => {
    expect(breadcrumbItems('/guides').map((item) => item.path)).toEqual(['/', '/guides'])
    for (const path of guidePaths.slice(1)) {
      const guide = guideByPath[path]
      const items = breadcrumbItems(path)
      expect(items.map((item) => item.path)).toEqual(['/', '/guides', path])
      expect(breadcrumbSchema(path)?.itemListElement.at(-1)?.item).toBe(`https://pdfhope.com${path}`)
      expect(articleSchema({ title: guide.seoTitle, description: guide.description, path, index: true })?.['@type']).toBe('Article')
    }
    expect(collectionPage({ title: 'PDF Guides | PDFHope', description: 'Guides', path: '/guides', index: true })?.['@type']).toBe('CollectionPage')
  })

  it('includes every guide route in the registry-driven prerender and sitemap source', () => {
    expect(prerenderPaths).toEqual(expect.arrayContaining(guidePaths))
    expect(new Set(prerenderPaths).size).toBe(prerenderPaths.length)
  })
})
