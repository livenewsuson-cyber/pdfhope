import { getTool } from './tools'
import type { ToolDefinition } from '../types/tools'

export type NavigationGroup = {
  id: 'convert' | 'organize' | 'edit' | 'intelligence' | 'advanced'
  label: string
  description: string
  tools: ToolDefinition[]
}

const toolList = (slugs: string[]) => slugs.map((slug) => {
  const tool = getTool(slug)
  if (!tool) throw new Error(`Unknown navigation tool: ${slug}`)
  return tool
})

export const navigationGroups: NavigationGroup[] = [
  {
    id: 'convert',
    label: 'Convert',
    description: 'Move between PDF, Word and image formats.',
    tools: toolList(['word-to-pdf', 'pdf-to-word', 'jpg-to-pdf', 'png-to-pdf', 'webp-to-pdf', 'images-to-pdf', 'pdf-to-jpg', 'pdf-to-png']),
  },
  {
    id: 'organize',
    label: 'Organize',
    description: 'Combine, separate and arrange document pages.',
    tools: toolList(['merge-pdf', 'split-pdf', 'extract-pdf-pages', 'delete-pdf-pages', 'reorder-pdf', 'rotate-pdf']),
  },
  {
    id: 'edit',
    label: 'Edit',
    description: 'Add useful content to a finished PDF.',
    tools: toolList(['edit-pdf', 'add-page-numbers', 'watermark-pdf']),
  },
  {
    id: 'intelligence',
    label: 'PDF Intelligence',
    description: 'Read, inspect and understand document structure.',
    tools: toolList(['pdf-health-check', 'blank-page-detector', 'duplicate-page-finder', 'page-size-analyzer', 'orientation-analyzer', 'pdf-size-breakdown', 'pdf-reader']),
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Specialist workflows for scans, print and privacy.',
    tools: toolList(['interleave-pdf', 'deinterleave-pdf', 'n-up-pdf', 'pdf-contact-sheet', 'pdf-metadata-cleaner']),
  },
]

export const intelligenceTools = navigationGroups.find((group) => group.id === 'intelligence')!.tools.slice(0, 5)
