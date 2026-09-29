import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { navigationGroups, type NavigationGroup } from '../data/navigation'
import { megaMenuShort } from '../data/navigationCopy'
import { calculateMegaMenuCenter } from '../lib/megaMenuPosition'
import { ToolIcon } from './ToolIcon'

export type MegaMenuMode = 'all' | NavigationGroup['id']

export function MegaMenu({ mode, anchorElement, onNavigate }: { mode: MegaMenuMode; anchorElement?: HTMLElement | null; onNavigate: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [center, setCenter] = useState<number | null>(null)
  const groups = mode === 'all' ? navigationGroups : navigationGroups.filter((group) => group.id === mode)

  useLayoutEffect(() => {
    if (mode === 'all') return
    const measure = () => {
      const menu = menuRef.current
      const shell = menu?.parentElement
      if (!menu || !shell || !anchorElement?.getClientRects().length) { setCenter(null); return }
      const triggerRect = anchorElement.getBoundingClientRect()
      const shellRect = shell.getBoundingClientRect()
      const menuWidth = menu.getBoundingClientRect().width
      const triggerCenter = triggerRect.left + triggerRect.width / 2 - shellRect.left
      const containerWidth = Math.min(shellRect.width, window.innerWidth - shellRect.left)
      setCenter(calculateMegaMenuCenter({ triggerCenter, menuWidth, containerWidth }))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [mode, anchorElement])

  return <div ref={menuRef} className={`mega-menu mega-menu--${mode === 'all' ? 'all' : 'category'}`} id="desktop-mega-menu" data-mode={mode} style={mode === 'all' ? undefined : { left: center ?? 0, visibility: center === null ? 'hidden' : undefined }}>
    {mode === 'all' && <div className="mega-menu-intro">
      <span className="kicker">PDFHope toolkit</span>
      <strong>Choose a focused workflow</strong>
      <p>Fast PDF tools with clear privacy boundaries.</p>
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
            <span><strong>{tool.name}</strong><small>{megaMenuShort[tool.slug] ?? tool.short}</small></span>
          </Link>)}
        </div>
      </section>)}
    </div>
  </div>
}
