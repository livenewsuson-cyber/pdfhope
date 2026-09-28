import { Command, Heart, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Brand } from './Brand'
import { MegaMenu } from './MegaMenu'
import { MobileNavigation } from './MobileNavigation'
import { tools } from '../data/tools'
import { navigationGroups, type NavigationGroup } from '../data/navigation'
import { useWebMcp } from '../hooks/useWebMcp'

const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Layout() {
  useWebMcp()
  const { pathname, search: routeSearch } = useLocation()
  const [dark, setDark] = useState(() => localStorage.getItem('pdfhope-theme') === 'dark' || (!localStorage.getItem('pdfhope-theme') && matchMedia('(prefers-color-scheme: dark)').matches))
  const [mobileMenu, setMobileMenu] = useState(false)
  const [megaMenu, setMegaMenu] = useState<NavigationGroup['id'] | null>(null)
  const [search, setSearch] = useState(false)
  const [query, setQuery] = useState('')
  const headerRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const mobileDialogRef = useRef<HTMLDivElement>(null)
  const searchDialogRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [pathname, routeSearch])
  useEffect(() => { const previous = history.scrollRestoration; history.scrollRestoration = 'manual'; return () => { history.scrollRestoration = previous } }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('pdfhope-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { setMegaMenu(null); setMobileMenu(false); setSearch(false) }, [pathname, routeSearch])
  useEffect(() => {
    if (!mobileMenu && !search) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [mobileMenu, search])
  useEffect(() => {
    if (!mobileMenu) return
    requestAnimationFrame(() => mobileDialogRef.current?.querySelector<HTMLElement>(focusable)?.focus())
  }, [mobileMenu])
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (megaMenu && !headerRef.current?.contains(event.target as Node)) setMegaMenu(null) }
    addEventListener('pointerdown', onPointerDown)
    return () => removeEventListener('pointerdown', onPointerDown)
  }, [megaMenu])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setMobileMenu(false); setMegaMenu(null); setSearch(true); return }
      if (event.key === 'Escape') {
        if (search) { setSearch(false); searchButtonRef.current?.focus() }
        else if (mobileMenu) { setMobileMenu(false); menuButtonRef.current?.focus() }
        else setMegaMenu(null)
        return
      }
      const dialog = search ? searchDialogRef.current : mobileMenu ? mobileDialogRef.current : null
      if (event.key !== 'Tab' || !dialog) return
      const items = [...dialog.querySelectorAll<HTMLElement>(focusable)].filter((item) => !item.closest('[hidden]'))
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [mobileMenu, search])

  const openSearch = () => { setMobileMenu(false); setMegaMenu(null); setSearch(true) }
  const closeNavigation = () => { setMegaMenu(null); setMobileMenu(false) }
  const results = tools.filter((tool) => `${tool.name} ${tool.short} ${tool.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8)

  return <div className="app-shell">
    <div className="header-shell" ref={headerRef}>
      <header className="header">
        <Link className="brand" to="/" aria-label="PDFHope home"><Brand /></Link>
        <nav className="desktop-navigation" aria-label="Primary">
          <NavLink to="/tools">All Tools</NavLink>
          {navigationGroups.map((group) => <button key={group.id} type="button" aria-expanded={megaMenu === group.id} aria-controls="desktop-mega-menu" onClick={() => setMegaMenu((open) => open === group.id ? null : group.id)}>{group.id === 'advanced' ? 'More' : group.label}</button>)}
        </nav>
        <div className="header-actions">
          <button ref={searchButtonRef} className="icon-button" onClick={openSearch} aria-label="Search tools"><Search size={19} /></button>
          <button className="icon-button theme-toggle" onClick={() => setDark(!dark)} aria-label={`Use ${dark ? 'light' : 'dark'} theme`}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button ref={menuButtonRef} className="icon-button mobile-menu-toggle" aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenu} aria-controls="mobile-navigation-dialog" onClick={() => { setSearch(false); setMegaMenu(null); setMobileMenu(!mobileMenu) }}>{mobileMenu ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </header>
      {megaMenu && <MegaMenu activeGroup={megaMenu} onNavigate={closeNavigation} />}
    </div>
    <Outlet />
    <footer><div><Link className="brand footer-brand" to="/" aria-label="PDFHope home"><Brand /></Link><p>Every PDF tool you need—built for speed, clarity, and privacy-conscious processing.</p></div><div><strong>Product</strong><Link to="/tools">All tools</Link><Link to="/pdf-health-check">PDF Health Check</Link><Link to="/privacy">Privacy</Link><Link to="/security">Security</Link></div><div><strong>Company</strong><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/accessibility">Accessibility</Link><Link to="/cookie-policy">Cookie policy</Link></div><div><strong>Legal</strong><Link to="/terms">Terms of use</Link><Link to="/privacy-policy">Privacy policy</Link><a href="/sitemap.xml">Sitemap</a><span className="footer-note"><Heart size={14} /> Made for useful PDFs</span></div></footer>
    {mobileMenu && <div className="mobile-nav-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileMenu(false) }}><div id="mobile-navigation-dialog" ref={mobileDialogRef} className="mobile-nav-dialog" role="dialog" aria-modal="true" aria-label="PDFHope menu"><div className="mobile-nav-head"><Link className="brand" to="/" onClick={closeNavigation}><Brand /></Link><button type="button" className="icon-button" onClick={() => { setMobileMenu(false); menuButtonRef.current?.focus() }} aria-label="Close navigation"><X size={20} /></button></div><MobileNavigation onNavigate={closeNavigation} /></div></div>}
    {search && <div className="command-backdrop" role="presentation" onMouseDown={() => setSearch(false)}><section ref={searchDialogRef} className="command-dialog" role="dialog" aria-modal="true" aria-label="Search PDF tools" onMouseDown={(event) => event.stopPropagation()}><label><Search size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PDFHope tools" aria-label="Search PDFHope tools" /><kbd>Esc</kbd></label><div className="command-results">{results.map((tool) => <Link key={tool.slug} to={`/${tool.slug}`} onClick={() => setSearch(false)}><span><strong>{tool.name}</strong><small>{tool.category} · {tool.short}</small></span><Command size={16} /></Link>)}</div></section></div>}
  </div>
}
