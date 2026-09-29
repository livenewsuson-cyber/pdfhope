import { getTool } from './tools'
import type { ToolDefinition } from '../types/tools'

export type NavigationGroup = {
  id: 'convert' | 'organize' | 'optimize' | 'edit' | 'security' | 'intelligence' | 'advanced'
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
    description: 'PDF, Office and image conversion.',
    tools: toolList(['word-to-pdf', 'pdf-to-word', 'excel-to-pdf', 'pdf-to-excel', 'powerpoint-to-pdf', 'pdf-to-powerpoint', 'jpg-to-pdf', 'png-to-pdf', 'webp-to-pdf', 'images-to-pdf', 'pdf-to-jpg', 'pdf-to-png']),
  },
  {
    id: 'organize',
    label: 'Organize',
    description: 'Merge, split and arrange pages.',
    tools: toolList(['merge-pdf', 'split-pdf', 'extract-pdf-pages', 'delete-pdf-pages', 'reorder-pdf', 'rotate-pdf']),
  },
  {
    id: 'optimize',
    label: 'Optimize',
    description: 'Reduce and analyze file size.',
    tools: toolList(['compress-pdf', 'pdf-size-breakdown']),
  },
  {
    id: 'edit',
    label: 'Edit',
    description: 'Edit and enhance PDFs.',
    tools: toolList(['edit-pdf', 'add-page-numbers', 'header-footer-pdf', 'watermark-pdf']),
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Protect, unlock and sign PDFs.',
    tools: toolList(['protect-pdf', 'unlock-pdf', 'sign-pdf', 'pdf-metadata-cleaner']),
  },
  {
    id: 'intelligence',
    label: 'PDF Intelligence',
    description: 'Inspect and understand PDFs.',
    tools: toolList(['pdf-health-check', 'blank-page-detector', 'duplicate-page-finder', 'page-size-analyzer', 'orientation-analyzer', 'pdf-reader']),
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Specialist PDF workflows.',
    tools: toolList(['interleave-pdf', 'deinterleave-pdf', 'n-up-pdf', 'pdf-contact-sheet']),
  },
]

export const intelligenceTools = navigationGroups.find((group) => group.id === 'intelligence')!.tools.slice(0, 5)
