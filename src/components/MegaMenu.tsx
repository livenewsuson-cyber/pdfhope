import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { navigationGroups, type NavigationGroup } from '../data/navigation'
import { ToolIcon } from './ToolIcon'

export function MegaMenu({ activeGroup, onNavigate }: { activeGroup: NavigationGroup['id']; onNavigate: () => void }) {
  return <div className="mega-menu" id="desktop-mega-menu">
    <div className="mega-menu-intro">
      <span className="kicker">PDFHope toolkit</span>
      <strong>Choose a focused workflow</strong>
      <p>Fast tools for everyday PDF work, with clear privacy boundaries.</p>
      <Link to="/tools" onClick={onNavigate}>Explore all tools <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
    <div className="mega-menu-groups">
      {navigationGroups.map((group) => <section className="mega-menu-group" data-active={group.id === activeGroup ? 'true' : undefined} key={group.id} aria-labelledby={`mega-${group.id}`}>
        <div className="mega-menu-heading">
          <h2 id={`mega-${group.id}`}>{group.label}</h2>
          <p>{group.description}</p>
        </div>
        <div className="mega-menu-links">
          {group.tools.map((tool) => <Link to={`/${tool.slug}`} key={tool.slug} onClick={onNavigate}>
            <ToolIcon slug={tool.slug} compact />
            <span><strong>{tool.name}</strong><small>{tool.short}</small></span>
          </Link>)}
        </div>
      </section>)}
    </div>
  </div>
}
