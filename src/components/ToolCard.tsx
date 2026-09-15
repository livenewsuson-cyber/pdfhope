import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ToolDefinition } from '../types/tools'
import { ToolIcon } from './ToolIcon'
import { toolAccent } from '../data/toolVisuals'

export function ToolCard({ tool, catalog = false }: { tool: ToolDefinition; catalog?: boolean }) {
  return <Link className={catalog ? 'catalog-card' : 'tool-card'} to={`/${tool.slug}`} data-accent={toolAccent(tool.slug)}>
    {catalog ? <>
      <div className="catalog-card-top"><ToolIcon slug={tool.slug} /><span className="category-pill">{tool.category}</span></div>
      <h2>{tool.name}</h2><p>{tool.short}</p>
      <span className="link-label">Open tool <ArrowRight size={16} aria-hidden="true" /></span>
    </> : <>
      <ToolIcon slug={tool.slug} /><span><strong>{tool.name}</strong><small>{tool.short}</small></span>
      <ArrowRight className="card-arrow" size={18} aria-hidden="true" />
    </>}
  </Link>
}
