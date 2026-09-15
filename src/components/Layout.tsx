import { Command, Heart, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect, useState } from 'react'
import { Brand } from './Brand'
import { tools } from '../data/tools'
import { useWebMcp } from '../hooks/useWebMcp'

export function Layout() {
  useWebMcp()
  const { pathname, search: routeSearch }=useLocation()
  const [dark,setDark]=useState(()=>localStorage.getItem('pdfhope-theme')==='dark'||(!localStorage.getItem('pdfhope-theme')&&matchMedia('(prefers-color-scheme: dark)').matches))
  const [menu,setMenu]=useState(false)
  const [search,setSearch]=useState(false),[query,setQuery]=useState('')
  useLayoutEffect(()=>{window.scrollTo({top:0,left:0,behavior:'auto'})},[pathname,routeSearch])
  useEffect(()=>{const previous=history.scrollRestoration;history.scrollRestoration='manual';return()=>{history.scrollRestoration=previous}},[])
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('pdfhope-theme',dark?'dark':'light')},[dark])
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setSearch(true)}if(event.key==='Escape'){setSearch(false);setMenu(false)}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[])
  const results=tools.filter((tool)=>`${tool.name} ${tool.short} ${tool.category}`.toLowerCase().includes(query.toLowerCase())).slice(0,8)
  return <div className="app-shell">
    <header className="header"><Link className="brand" to="/" aria-label="PDFHope home"><Brand/></Link><nav id="primary-navigation" className={menu?'is-open':undefined} aria-label="Primary" onClick={()=>setMenu(false)}><NavLink to="/tools">All tools</NavLink><NavLink to="/pdf-reader">Reader</NavLink><NavLink to="/edit-pdf">Editor</NavLink><NavLink to="/pdf-health-check">Health Check</NavLink><NavLink to="/privacy">Privacy</NavLink></nav><div className="header-actions"><button className="icon-button mobile-menu-toggle" aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} aria-controls="primary-navigation" onClick={()=>setMenu(!menu)}>{menu?<X size={19}/>:<Menu size={19}/>}</button><button className="icon-button" onClick={()=>setSearch(true)} aria-label="Search tools"><Search size={19}/></button><button className="icon-button" onClick={()=>setDark(!dark)} aria-label={`Use ${dark?'light':'dark'} theme`}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button></div></header>
    <Outlet />
    <footer><div><Link className="brand footer-brand" to="/" aria-label="PDFHope home"><Brand/></Link><p>Every PDF tool you need—built for speed, clarity, and privacy-conscious processing.</p></div><div><strong>Product</strong><Link to="/tools">All tools</Link><Link to="/pdf-health-check">PDF Health Check</Link><Link to="/privacy">Privacy</Link><Link to="/security">Security</Link></div><div><strong>Company</strong><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/accessibility">Accessibility</Link><Link to="/cookie-policy">Cookie policy</Link></div><div><strong>Legal</strong><Link to="/terms">Terms of use</Link><Link to="/privacy-policy">Privacy policy</Link><a href="/sitemap.xml">Sitemap</a><span className="footer-note"><Heart size={14}/> Made for useful PDFs</span></div></footer>
    {search&&<div className="command-backdrop" role="presentation" onMouseDown={()=>setSearch(false)}><section className="command-dialog" role="dialog" aria-modal="true" aria-label="Search PDF tools" onMouseDown={(event)=>event.stopPropagation()}><label><Search size={20}/><input autoFocus value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search PDFHope tools"/><kbd>Esc</kbd></label><div className="command-results">{results.map((tool)=><Link key={tool.slug} to={`/${tool.slug}`} onClick={()=>setSearch(false)}><span><strong>{tool.name}</strong><small>{tool.short}</small></span><Command size={16}/></Link>)}</div></section></div>}
  </div>
}
