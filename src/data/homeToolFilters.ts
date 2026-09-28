import { navigationGroups, type NavigationGroup } from './navigation'
import { tools } from './tools'
import type { ToolDefinition } from '../types/tools'

export type HomeToolFilter = 'popular' | 'all' | NavigationGroup['id']
type FilterOption = { id: HomeToolFilter; label: string; heading: string; description: string; tools: ToolDefinition[] }

const groupHeadings: Record<NavigationGroup['id'], string> = {
  convert: 'Convert PDF & document files',
  organize: 'Organize PDF pages',
  optimize: 'Optimize PDF files',
  edit: 'Edit and enhance PDFs',
  intelligence: 'Understand your PDF',
  advanced: 'Advanced PDF workflows',
}

export const homeToolFilters: FilterOption[] = [
  { id: 'popular', label: 'Popular', heading: 'Popular PDF tools', description: 'The tools PDFHope users reach for most often. Choose a category to explore more.', tools: tools.filter((tool) => tool.popular) },
  { id: 'all', label: 'All', heading: 'All PDF tools', description: 'Browse every available PDFHope tool, or narrow the list by task.', tools },
  ...navigationGroups.filter((group) => group.tools.length > 0).map((group) => ({
    id: group.id,
    label: group.label,
    heading: groupHeadings[group.id],
    description: group.description,
    tools: group.tools,
  })),
]
