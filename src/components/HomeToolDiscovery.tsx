import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { homeToolFilters, type HomeToolFilter } from '../data/homeToolFilters'
import { ToolCard } from './ToolCard'

const INITIAL_ALL_LIMIT = 16

export function HomeToolDiscovery() {
  const [activeFilter, setActiveFilter] = useState<HomeToolFilter>('popular')
  const [expandedAll, setExpandedAll] = useState(false)
  const selected = homeToolFilters.find((filter) => filter.id === activeFilter) ?? homeToolFilters[0]
  const visibleTools = activeFilter === 'all' && !expandedAll ? selected.tools.slice(0, INITIAL_ALL_LIMIT) : selected.tools

  return <section className="tools-section" aria-labelledby="home-tools-heading">
    <div className="section-heading home-discovery-heading">
      <div><span className="kicker">Find your tool</span><h2 id="home-tools-heading">{selected.heading}</h2><p className="home-discovery-description" aria-live="polite">{selected.description}</p></div>
      <Link to="/tools">Browse all tools <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
    <div className="home-tool-filters" role="group" aria-label="Filter PDF tools">
      {homeToolFilters.map((filter) => <button key={filter.id} type="button" data-filter={filter.id} aria-pressed={activeFilter === filter.id} aria-controls="home-tool-grid" onClick={() => { setActiveFilter(filter.id); setExpandedAll(false) }}>
        {filter.label}<span className="home-filter-count" aria-hidden="true">{filter.tools.length}</span>
      </button>)}
    </div>
    <div id="home-tool-grid" className="tool-grid">{visibleTools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div>
    {activeFilter === 'all' && selected.tools.length > INITIAL_ALL_LIMIT && <button className="home-show-more" type="button" aria-controls="home-tool-grid" aria-expanded={expandedAll} onClick={() => setExpandedAll((current) => !current)}>{expandedAll ? 'Show fewer' : `Show all ${selected.tools.length} tools`}</button>}
  </section>
}
