import { navigationGroups } from './navigation'
import type { ToolDefinition } from '../types/tools'

export type ToolBadge = 'popular' | 'new'
export type ToolProcessingMode = 'Local' | 'Secure conversion'

const presentationGroups = new Map(navigationGroups.flatMap((group) => group.tools.map((tool) => [tool.slug, group.label] as const)))

export function getToolPresentationGroup(slug: string): string | undefined {
  return presentationGroups.get(slug)
}

export function getToolProcessingMode(slug: string): ToolProcessingMode {
  return ['word-to-pdf', 'pdf-to-word', 'excel-to-pdf', 'powerpoint-to-pdf', 'pdf-to-excel', 'pdf-to-powerpoint'].includes(slug) ? 'Secure conversion' : 'Local'
}

export function getToolBadge(tool: ToolDefinition): ToolBadge | null {
  return tool.popular ? 'popular' : null
}
