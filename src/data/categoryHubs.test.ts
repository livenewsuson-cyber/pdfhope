import { describe, expect, it } from 'vitest'
import { categoryHubs } from './categoryHubs'
import { navigationGroups } from './navigation'
import { tools } from './tools'
import { breadcrumbItems, breadcrumbSchema } from '../lib/breadcrumbs'
import { toolHowToHeading } from './toolHeadings'

describe('category SEO architecture', () => {
  it('has seven unique hubs and assigns every tool to exactly one hub', () => {
    expect(categoryHubs).toHaveLength(7)
    expect(new Set(categoryHubs.map((hub) => hub.path)).size).toBe(7)
    expect(navigationGroups.map((group) => group.href)).toEqual(categoryHubs.map((hub) => hub.path))
    for (const tool of tools) {
      expect(navigationGroups.filter((group) => group.tools.some((item) => item.slug === tool.slug))).toHaveLength(1)
      expect(toolHowToHeading(tool.slug)).not.toBe('How to Use This PDF Tool')
    }
  })

  it('builds visible and structured breadcrumbs from the same hierarchy', () => {
    for (const hub of categoryHubs) {
      expect(breadcrumbItems(hub.path).map((item) => item.path)).toEqual(['/', '/tools', hub.path])
      expect(breadcrumbSchema(hub.path)?.itemListElement).toHaveLength(3)
      for (const tool of navigationGroups.find((group) => group.id === hub.id)!.tools) {
        const path = `/${tool.slug}`
        expect(breadcrumbItems(path).map((item) => item.path)).toEqual(['/', '/tools', hub.path, path])
        expect(breadcrumbSchema(path)?.itemListElement.at(-1)?.item).toBe(`https://pdfhope.com${path}`)
      }
    }
  })
})
