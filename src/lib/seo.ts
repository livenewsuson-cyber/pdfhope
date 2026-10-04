import { createContext } from 'react'
import { navigationGroups } from '../data/navigation'
import { guideByPath, guides } from '../data/guides'

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
  if (page.path === '/guides') return {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: page.title, description: page.description, url: 'https://pdfhope.com/guides',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: guides.map((guide, index) => ({ '@type': 'ListItem', position: index + 1, name: guide.title, url: `https://pdfhope.com/guides/${guide.slug}` })),
    },
  }
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

export function articleSchema(page: PageSeo) {
  const guide = guideByPath[page.path]
  if (!guide) return null
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://pdfhope.com${page.path}` },
    url: `https://pdfhope.com${page.path}`,
    datePublished: guide.datePublished,
    author: { '@type': 'Organization', name: 'PDFHope', url: 'https://pdfhope.com/' },
    publisher: { '@type': 'Organization', name: 'PDFHope', url: 'https://pdfhope.com/' },
  }
}
