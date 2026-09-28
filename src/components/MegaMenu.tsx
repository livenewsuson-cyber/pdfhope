import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { navigationGroups, type NavigationGroup } from '../data/navigation'
import { ToolIcon } from './ToolIcon'

export type MegaMenuMode = 'all' | NavigationGroup['id']

export function MegaMenu({ mode, onNavigate }: { mode: MegaMenuMode; onNavigate: () => void }) {
  const groups = mode === 'all' ? navigationGroups : navigationGroups.filter((group) => group.id === mode)

  return <div className={`mega-menu mega-menu--${mode === 'all' ? 'all' : 'category'}`} id="desktop-mega-menu" data-mode={mode}>
    {mode === 'all' && <div className="mega-menu-intro">
      <span className="kicker">PDFHope toolkit</span>
      <strong>Choose a focused workflow</strong>
      <p>Fast tools for everyday PDF work, with clear privacy boundaries.</p>
      <Link to="/tools" onClick={onNavigate}>Explore all tools <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>}
    <div className="mega-menu-groups">
      {groups.map((group) => <section className="mega-menu-group" key={group.id} aria-labelledby={`mega-${group.id}`}>
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
