import { Command, Heart, Moon, Search, Sun } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { tools } from '../data/tools'
import { useWebMcp } from '../hooks/useWebMcp'

export function Layout() {
  useWebMcp()
  const [dark,setDark]=useState(()=>localStorage.getItem('pdfhope-theme')==='dark'||(!localStorage.getItem('pdfhope-theme')&&matchMedia('(prefers-color-scheme: dark)').matches))
  const [search,setSearch]=useState(false),[query,setQuery]=useState('')
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('pdfhope-theme',dark?'dark':'light')},[dark])
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setSearch(true)}if(event.key==='Escape')setSearch(false)};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[])
  const results=tools.filter((tool)=>`${tool.name} ${tool.short} ${tool.category}`.toLowerCase().includes(query.toLowerCase())).slice(0,8)
  return <div className="app-shell">
    <header className="header"><Link className="brand" to="/" aria-label="PDFHope home"><span className="brand-mark">P</span><span>PDFHope</span></Link><nav aria-label="Primary"><NavLink to="/tools">All tools</NavLink><NavLink to="/pdf-health-check">Health Check</NavLink><NavLink to="/privacy">Privacy</NavLink></nav><div className="header-actions"><button className="icon-button" onClick={()=>setSearch(true)} aria-label="Search tools"><Search size={19}/></button><button className="icon-button" onClick={()=>setDark(!dark)} aria-label={`Use ${dark?'light':'dark'} theme`}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button></div></header>
    <Outlet />
    <footer><div><Link className="brand footer-brand" to="/"><span className="brand-mark">P</span><span>PDFHope</span></Link><p>Every PDF tool you need—built for speed, clarity, and local processing.</p></div><div><strong>Product</strong><Link to="/tools">All tools</Link><Link to="/pdf-health-check">PDF Health Check</Link><Link to="/privacy">Privacy</Link><Link to="/security">Security</Link></div><div><strong>Company</strong><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/accessibility">Accessibility</Link><Link to="/cookie-policy">Cookie policy</Link></div><div><strong>Legal</strong><Link to="/terms">Terms of use</Link><Link to="/privacy-policy">Privacy policy</Link><a href="/sitemap.xml">Sitemap</a><span className="footer-note"><Heart size={14}/> Made for useful PDFs</span></div></footer>
    {search&&<div className="command-backdrop" role="presentation" onMouseDown={()=>setSearch(false)}><section className="command-dialog" role="dialog" aria-modal="true" aria-label="Search PDF tools" onMouseDown={(event)=>event.stopPropagation()}><label><Search size={20}/><input autoFocus value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search PDFHope tools"/><kbd>Esc</kbd></label><div className="command-results">{results.map((tool)=><Link key={tool.slug} to={`/${tool.slug}`} onClick={()=>setSearch(false)}><span><strong>{tool.name}</strong><small>{tool.short}</small></span><Command size={16}/></Link>)}</div></section></div>}
  </div>
}
