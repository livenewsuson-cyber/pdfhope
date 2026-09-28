import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ToolDefinition } from '../types/tools'
import { ToolIcon } from './ToolIcon'
import { toolAccent } from '../data/toolVisuals'
import { getToolBadge, getToolPresentationGroup, getToolProcessingMode } from '../data/toolPresentation'

export function ToolCard({ tool, catalog = false, showBadge = true }: { tool: ToolDefinition; catalog?: boolean; showBadge?: boolean }) {
  const badge = showBadge ? getToolBadge(tool) : null
  const badgeElement = badge && <span className="tool-card-badge">{badge === 'popular' ? 'Popular' : 'New'}</span>

  return <Link className={`tool-card ${catalog ? 'catalog-card' : 'tool-card--compact'}`} to={`/${tool.slug}`} data-accent={toolAccent(tool.slug)}>
    <div className="tool-card-top">
      <ToolIcon slug={tool.slug} />
      {catalog && <span className="tool-card-category">{getToolPresentationGroup(tool.slug) ?? tool.category}</span>}
      {catalog && badgeElement}
    </div>
    <div className="tool-card-content">
      <div className="tool-card-title-row">
        {catalog ? <h2>{tool.name}</h2> : <strong>{tool.name}</strong>}
        {!catalog && badgeElement}
      </div>
      <p className="tool-card-description">{tool.short}</p>
    </div>
    <div className="tool-card-footer">
      {catalog && <span className="tool-card-processing">{getToolProcessingMode(tool.slug)}</span>}
      <span className="tool-card-open">{catalog && 'Open tool'} <ArrowRight size={catalog ? 16 : 18} aria-hidden="true" /></span>
    </div>
  </Link>
}
