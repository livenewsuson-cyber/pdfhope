import { createContext } from 'react'
import { navigationGroups } from '../data/navigation'

export type PageSeo = { title: string; description: string; path: string; index: boolean }
// Build-time rendering collects the same metadata used by client-side navigation.
export const SeoContext = createContext<((page: PageSeo) => void) | null>(null)

export function webApplication(page: PageSeo) {
  return {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: page.title.replace(/ \| PDFHope$/, ''), description: page.description,
    url: `https://pdfhope.com${page.path}`, applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any operating system with a modern web browser',
    browserRequirements: 'Requires JavaScript and a modern web browser',
  }
}

export function collectionPage(page: PageSeo) {
  const group = navigationGroups.find((item) => item.href === page.path)
  if (!group) return null
  return {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: page.title, description: page.description, url: `https://pdfhope.com${page.path}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: group.tools.map((tool, index) => ({ '@type': 'ListItem', position: index + 1, name: tool.name, url: `https://pdfhope.com/${tool.slug}` })),
    },
  }
}
