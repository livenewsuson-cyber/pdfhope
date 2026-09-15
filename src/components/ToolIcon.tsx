import { FileSearch } from 'lucide-react'
import { icons } from '../data/toolVisuals'

export function ToolIcon({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [Icon, accent] = icons[slug] ?? [FileSearch, 'blue']
  return <span className={`tool-icon${compact ? ' tool-icon-compact' : ''}`} data-accent={accent} aria-hidden="true">
    <Icon size={compact ? 20 : 24} strokeWidth={1.8} focusable="false" />
  </span>
}
