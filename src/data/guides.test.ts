import { describe, expect, it } from 'vitest'
import { getTool } from './tools'
import { breadcrumbItems, breadcrumbSchema } from '../lib/breadcrumbs'
import { articleSchema, collectionPage } from '../lib/seo'
import { guideBatch2 } from './guideBatch2'
import { guideByPath, guidePaths, guides, guideWordCount } from './guides'
import { toolSeo } from './toolSeo'
import { paths as prerenderPaths } from '../prerender'

describe('guide SEO architecture', () => {
  it('adds exactly four Batch 2 guides to a unique registry', () => {
    expect(guideBatch2).toHaveLength(4)
    for (const field of ['slug', 'title', 'seoTitle', 'description', 'intro'] as const) {
      expect(new Set(guides.map((guide) => guide[field])).size).toBe(guides.length)
    }
    expect(new Set(guideBatch2.map((guide) => guide.slug))).toEqual(new Set(['pdf-to-excel', 'pdf-to-powerpoint', 'merge-pdf', 'pdf-password-security']))
  })

  it('keeps every new guide substantial and editorially distinct', () => {
    const wordCounts = Object.fromEntries(guideBatch2.map((guide) => [guide.slug, guideWordCount(guide)]))
    expect(wordCounts).toEqual(Object.fromEntries(Object.entries(wordCounts).map(([slug, count]) => [slug, Math.max(1500, count)])))
    const guideParagraphs = guides.flatMap((guide) => [
      guide.intro,
      guide.shortAnswer,
      ...guide.sections.flatMap((section) => [
        ...(section.paragraphs ?? []),
        ...(section.subheadings?.flatMap((item) => item.paragraphs) ?? []),
        ...(section.steps?.map((item) => item.text) ?? []),
      ]),
      ...guide.faq.map((item) => item.answer),
    ])
    expect(new Set(guideParagraphs).size).toBe(guideParagraphs.length)
    const toolParagraphs = Object.values(toolSeo).flatMap((entry) => [entry.intro, ...entry.overview])
    for (const paragraph of guideParagraphs) expect(toolParagraphs).not.toContain(paragraph)
  })

  it('uses existing tools for every primary and related link', () => {
    for (const guide of guides) {
      const primaryTools = [guide.primaryTool, ...(guide.additionalPrimaryTools ?? [])]
      for (const primary of primaryTools) {
        expect(primary.path).toMatch(/^\/[a-z0-9-]+$/)
        expect(getTool(primary.path.slice(1))).toBeTruthy()
        expect(toolSeo[primary.path.slice(1)].seoTitle).not.toBe(guide.seoTitle)
        expect(getTool(primary.path.slice(1))?.name).not.toBe(guide.title)
      }
      expect(guide.relatedTools.length).toBeGreaterThanOrEqual(2)
      for (const related of guide.relatedTools) expect(getTool(related.path.slice(1))).toBeTruthy()
      for (const relatedGuide of guide.relatedGuides ?? []) expect(guideByPath[relatedGuide]).toBeTruthy()
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
