import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { navigationGroups } from '../data/navigation'
import { ToolIcon } from './ToolIcon'

export function MobileNavigation({ onNavigate }: { onNavigate: () => void }) {
  const [openGroup, setOpenGroup] = useState<string>('convert')
  return <nav className="mobile-navigation" aria-label="Mobile navigation">
    <Link className="mobile-all-tools" to="/tools" onClick={onNavigate}>All Tools <span>Browse the complete toolkit</span></Link>
    <div className="mobile-nav-groups">
      {navigationGroups.map((group) => {
        const expanded = openGroup === group.id
        return <section key={group.id}>
          <button type="button" aria-expanded={expanded} aria-controls={`mobile-${group.id}`} onClick={() => setOpenGroup(expanded ? '' : group.id)}>
            <span>{group.label}<small>{group.description}</small></span><ChevronDown size={18} aria-hidden="true" />
          </button>
          <div id={`mobile-${group.id}`} className="mobile-nav-links" hidden={!expanded}>
            <Link className="mobile-category-link" to={group.href} onClick={onNavigate}>Explore {group.label} tools</Link>
            {group.tools.map((tool) => <Link to={`/${tool.slug}`} key={tool.slug} onClick={onNavigate}><ToolIcon slug={tool.slug} compact /><span>{tool.name}</span></Link>)}
          </div>
        </section>
      })}
    </div>
    <div className="mobile-company"><strong>Company</strong><Link to="/about" onClick={onNavigate}>About</Link><Link to="/privacy" onClick={onNavigate}>Privacy</Link><Link to="/security" onClick={onNavigate}>Security</Link><Link to="/contact" onClick={onNavigate}>Contact</Link></div>
  </nav>
}
