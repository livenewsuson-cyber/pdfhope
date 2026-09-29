import { describe, expect, it } from 'vitest'
import { navigationGroups } from './navigation'
import { getToolProcessingMode } from './toolPresentation'
import { toolSeo } from './toolSeo'
import { getTool } from './tools'

describe('competitive parity tool registry', () => {
  it.each([
    ['excel-to-pdf','excel-to-pdf','Convert','convert','Secure conversion'],
    ['powerpoint-to-pdf','powerpoint-to-pdf','Convert','convert','Secure conversion'],
    ['header-footer-pdf','header-footer','Edit','edit','Local'],
  ])('%s has route, kind, category, navigation, processing label and unique SEO', (slug, kind, category, groupId, processing) => {
    const tool = getTool(slug)
    expect(tool).toMatchObject({ slug, kind, category })
    expect(navigationGroups.find(group => group.id === groupId)?.tools.some(item => item.slug === slug)).toBe(true)
    expect(getToolProcessingMode(slug)).toBe(processing)
    expect(toolSeo[slug]?.seoTitle).toContain('PDFHope')
    expect(toolSeo[slug]?.faq.length).toBeGreaterThan(0)
    expect(Object.values(toolSeo).filter(value => value.seoTitle === toolSeo[slug].seoTitle)).toHaveLength(1)
  })
})
