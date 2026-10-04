import { categoryHubByPath } from '../data/categoryHubs'
import { navigationGroups } from '../data/navigation'
import { getTool } from '../data/tools'
import { toolH1 } from '../data/toolHeadings'
import { guideByPath } from '../data/guides'

export type BreadcrumbItem = { name: string; path: string }

export function breadcrumbItems(path: string): BreadcrumbItem[] {
  if (path === '/guides') return [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }]
  const guide = guideByPath[path]
  if (guide) return [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }, { name: guide.title, path }]
  const base = [{ name: 'Home', path: '/' }, { name: 'PDF Tools', path: '/tools' }]
  const hub = categoryHubByPath[path]
  if (hub) return [...base, { name: hub.label, path: hub.path }]
  const tool = getTool(path.slice(1))
  if (!tool) return []
  const group = navigationGroups.find((item) => item.tools.some((candidate) => candidate.slug === tool.slug))
  if (!group) throw new Error(`Tool has no category hub: ${tool.slug}`)
  return [...base, { name: categoryHubByPath[group.href].label, path: group.href }, { name: toolH1(tool.slug, tool.name), path }]
}

export function breadcrumbSchema(path: string) {
  const items = breadcrumbItems(path)
  if (!items.length) return null
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: `https://pdfhope.com${item.path}` })),
  }
}
