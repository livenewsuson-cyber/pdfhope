import { createContext } from 'react'

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
