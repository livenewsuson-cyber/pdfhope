import { ChevronDown, Command, Heart, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Brand } from './Brand'
import { MegaMenu } from './MegaMenu'
import { MobileNavigation } from './MobileNavigation'
import { tools } from '../data/tools'
import { navigationGroups } from '../data/navigation'
import type { MegaMenuMode } from './MegaMenu'
import { useWebMcp } from '../hooks/useWebMcp'

const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Layout() {
  useWebMcp()
  const { pathname, search: routeSearch } = useLocation()
  const [dark, setDark] = useState(() => localStorage.getItem('pdfhope-theme') === 'dark' || (!localStorage.getItem('pdfhope-theme') && matchMedia('(prefers-color-scheme: dark)').matches))
  const [mobileMenu, setMobileMenu] = useState(false)
  const [megaMenu, setMegaMenu] = useState<MegaMenuMode | null>(null)
  const [megaMenuAnchor, setMegaMenuAnchor] = useState<HTMLElement | null>(null)
  const [search, setSearch] = useState(false)
  const [query, setQuery] = useState('')
  const headerRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const mobileDialogRef = useRef<HTMLDivElement>(null)
  const searchDialogRef = useRef<HTMLElement>(null)
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastHoverOpen = useRef(0)
  const keyboardFocus = useRef(false)

  const cancelMenuOpen = () => {
    if (menuOpenTimer.current) clearTimeout(menuOpenTimer.current)
    menuOpenTimer.current = null
  }
  const cancelMenuClose = () => {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current)
    menuCloseTimer.current = null
  }
  const closeMenuSoon = () => {
    cancelMenuOpen()
    cancelMenuClose()
    menuCloseTimer.current = setTimeout(() => setMegaMenu(null), 150)
  }
  const showMenu = (mode: MegaMenuMode, anchor: HTMLElement | null) => {
    cancelMenuOpen()
    cancelMenuClose()
    setMegaMenuAnchor(anchor)
    setMegaMenu(mode)
  }
  const showMenuSoon = (mode: MegaMenuMode, anchor: HTMLElement | null) => {
    cancelMenuOpen()
    cancelMenuClose()
    menuOpenTimer.current = setTimeout(() => {
      lastHoverOpen.current = Date.now()
      setMegaMenuAnchor(anchor)
      setMegaMenu(mode)
      menuOpenTimer.current = null
    }, 75)
  }

  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [pathname, routeSearch])
  useEffect(() => { const previous = history.scrollRestoration; history.scrollRestoration = 'manual'; return () => { history.scrollRestoration = previous } }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('pdfhope-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { setMegaMenu(null); setMobileMenu(false); setSearch(false) }, [pathname, routeSearch])
  useEffect(() => () => {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current)
    if (menuOpenTimer.current) clearTimeout(menuOpenTimer.current)
  }, [])
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
      if (event.key === 'Tab') keyboardFocus.current = true
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

  const openSearch = () => { cancelMenuOpen(); cancelMenuClose(); setMobileMenu(false); setMegaMenu(null); setSearch(true) }
  const closeNavigation = () => { cancelMenuOpen(); cancelMenuClose(); setMegaMenu(null); setMobileMenu(false) }
  const results = tools.filter((tool) => `${tool.name} ${tool.short} ${tool.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8)

  return <div className="app-shell">
    <div className="header-shell" ref={headerRef} onPointerDown={() => { keyboardFocus.current = false }} onPointerLeave={closeMenuSoon} onPointerEnter={cancelMenuClose} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenuSoon() }}>
      <header className="header">
        <Link className="brand" to="/" aria-label="PDFHope home" onPointerEnter={closeMenuSoon}><Brand /></Link>
        <nav className="desktop-navigation" aria-label="Primary">
          <NavLink to="/tools" aria-haspopup="true" aria-expanded={megaMenu === 'all'} aria-controls="desktop-mega-menu" onPointerEnter={(event) => { if (event.pointerType !== 'touch') showMenuSoon('all', event.currentTarget) }} onFocus={(event) => { if (keyboardFocus.current) showMenu('all', event.currentTarget) }}>All Tools<ChevronDown size={14} aria-hidden="true" /></NavLink>
          {navigationGroups.map((group) => <button key={group.id} type="button" aria-haspopup="true" aria-expanded={megaMenu === group.id} aria-controls="desktop-mega-menu" onPointerEnter={(event) => { if (event.pointerType !== 'touch') showMenuSoon(group.id, event.currentTarget) }} onFocus={(event) => { if (keyboardFocus.current) showMenu(group.id, event.currentTarget) }} onClick={(event) => {
            const justOpenedByHover = megaMenu === group.id && Date.now() - lastHoverOpen.current < 250
            cancelMenuOpen()
            cancelMenuClose()
            setMegaMenuAnchor(event.currentTarget)
            setMegaMenu((open) => justOpenedByHover ? group.id : open === group.id ? null : group.id)
          }}>{group.label}<ChevronDown size={14} aria-hidden="true" /></button>)}
        </nav>
        <div className="header-actions" onPointerEnter={closeMenuSoon}>
          <button ref={searchButtonRef} className="icon-button" onClick={openSearch} aria-label="Search tools"><Search size={19} /></button>
          <button className="icon-button theme-toggle" onClick={() => setDark(!dark)} aria-label={`Use ${dark ? 'light' : 'dark'} theme`}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button ref={menuButtonRef} className="icon-button mobile-menu-toggle" aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenu} aria-controls="mobile-navigation-dialog" onClick={() => { setSearch(false); setMegaMenu(null); setMobileMenu(!mobileMenu) }}>{mobileMenu ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </header>
      {megaMenu && <MegaMenu mode={megaMenu} anchorElement={megaMenuAnchor} onNavigate={closeNavigation} />}
    </div>
    <Outlet />
    <footer><div><Link className="brand footer-brand" to="/" aria-label="PDFHope home"><Brand /></Link><p>Every PDF tool you need—built for speed, clarity, and privacy-conscious processing.</p></div><div><strong>Product</strong><Link to="/tools">All tools</Link><Link to="/pdf-health-check">PDF Health Check</Link><Link to="/privacy">Privacy</Link><Link to="/security">Security</Link></div><div className="footer-popular"><strong>Popular Tools</strong>{['merge-pdf','compress-pdf','pdf-to-word','word-to-pdf','jpg-to-pdf','pdf-to-jpg','edit-pdf','ocr-pdf'].map(slug => { const tool = tools.find(item => item.slug === slug)!; return <Link key={slug} to={`/${slug}`}>{tool.name}</Link> })}</div><div><strong>Company</strong><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/accessibility">Accessibility</Link><Link to="/cookie-policy">Cookie policy</Link></div><div><strong>Legal</strong><Link to="/terms">Terms of use</Link><Link to="/privacy-policy">Privacy policy</Link><a href="/sitemap.xml">Sitemap</a><span className="footer-note"><Heart size={14} /> Made for useful PDFs</span></div></footer>
    {mobileMenu && <div className="mobile-nav-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileMenu(false) }}><div id="mobile-navigation-dialog" ref={mobileDialogRef} className="mobile-nav-dialog" role="dialog" aria-modal="true" aria-label="PDFHope menu"><div className="mobile-nav-head"><Link className="brand" to="/" onClick={closeNavigation}><Brand /></Link><button type="button" className="icon-button" onClick={() => { setMobileMenu(false); menuButtonRef.current?.focus() }} aria-label="Close navigation"><X size={20} /></button></div><MobileNavigation onNavigate={closeNavigation} /></div></div>}
    {search && <div className="command-backdrop" role="presentation" onMouseDown={() => setSearch(false)}><section ref={searchDialogRef} className="command-dialog" role="dialog" aria-modal="true" aria-label="Search PDF tools" onMouseDown={(event) => event.stopPropagation()}><label><Search size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PDFHope tools" aria-label="Search PDFHope tools" /><kbd>Esc</kbd></label><div className="command-results">{results.map((tool) => <Link key={tool.slug} to={`/${tool.slug}`} onClick={() => setSearch(false)}><span><strong>{tool.name}</strong><small>{tool.category} · {tool.short}</small></span><Command size={16} /></Link>)}</div></section></div>}
  </div>
}
