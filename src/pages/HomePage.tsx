import { ArrowRight, Clock3, Laptop, LockKeyhole, Search, Server, ShieldCheck, Smartphone, Sparkles, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTool, tools } from '../data/tools'
import { intelligenceTools } from '../data/navigation'
import { ToolCard } from '../components/ToolCard'
import { ToolIcon } from '../components/ToolIcon'
import { useSeo } from '../hooks/useSeo'

export function HomePage() {
  useSeo('Every PDF tool you need', 'Fast PDF tools to convert, organize, edit and inspect documents, with local processing where supported and secure server conversion when needed.', '/')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const recent = useMemo(() => {
    try { return (JSON.parse(localStorage.getItem('pdfhope-recent') || '[]') as string[]).map(getTool).filter(Boolean).slice(0, 4) }
    catch { return [] }
  }, [])
  const filtered = tools.filter((tool) => `${tool.name} ${tool.short} ${tool.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6)

  return <main>
    <section className="hero">
      <div className="eyebrow"><Sparkles size={15} /> Fast. Private. Built for PDFs.</div>
      <h1>Every <span className="hero-emphasis">PDF tool</span> you need.</h1>
      <p>Convert, organize, edit and understand documents with fast tools and privacy-conscious processing.</p>
      <div className="hero-search-wrap">
        <label className="search-box"><Search aria-hidden="true" /><input id="home-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && filtered[0]) navigate(`/${filtered[0].slug}`) }} placeholder="Search PDF tools" aria-label="Search PDF tools" /><kbd>Ctrl K</kbd></label>
        {query && <div className="hero-results">{filtered.map((tool) => <Link to={`/${tool.slug}`} key={tool.slug}><strong>{tool.name}</strong><span>{tool.category} · {tool.short}</span><ArrowRight size={16} /></Link>)}</div>}
      </div>
      <div className="trust-row"><span><ShieldCheck size={16} /> No signup for core tools</span><span><LockKeyhole size={16} /> Local processing where supported</span><span><Smartphone size={16} /> Works on mobile</span></div>
    </section>

    <section className="tools-section"><div className="section-heading"><div><span className="kicker">Start here</span><h2>Popular tools</h2></div><Link to="/tools">Browse all tools <ArrowRight size={16} /></Link></div><div className="tool-grid">{tools.filter((tool) => tool.popular).slice(0, 10).map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div></section>

    {recent.length > 0 && <section className="recent-section"><div className="section-heading"><div><span className="kicker">Stored only in this browser</span><h2>Recently used</h2></div></div><div className="recent-row">{recent.map((tool) => <Link key={tool!.slug} to={`/${tool!.slug}`}><Clock3 size={18} /><span><strong>{tool!.name}</strong><small>{tool!.category}</small></span></Link>)}</div></section>}

    <section className="intelligence-section">
      <div className="intelligence-copy"><span className="kicker">PDF Intelligence</span><h2>Understand your PDF</h2><p>Inspect document structure, page issues, duplicate pages, orientation and document health—without pretending a black box knows more than it does.</p><Link to="/pdf-health-check">Start with PDF Health Check <ArrowRight size={16} /></Link></div>
      <div className="intelligence-tools">{intelligenceTools.map((tool) => <Link key={tool.slug} to={`/${tool.slug}`}><ToolIcon slug={tool.slug} compact /><span><strong>{tool.name}</strong><small>{tool.short}</small></span><ArrowRight size={16} aria-hidden="true" /></Link>)}</div>
    </section>

    <section className="privacy-band"><div className="privacy-intro"><div className="privacy-orbit"><ShieldCheck size={38} /></div><div><span className="kicker">Designed for privacy</span><h2>Clear processing, not blanket claims.</h2><p>PDFHope tells you where a file is processed before you act.</p></div></div><div className="privacy-modes"><article><Laptop size={20} /><div><strong>Most browser PDF tools</strong><p>Merge, split, inspect and edit locally on your device.</p></div></article><article><Server size={20} /><div><strong>Word and PDF conversion</strong><p>Uses a secure server conversion workflow when you choose Convert.</p></div></article></div><Link to="/privacy">How processing works <ArrowRight size={16} /></Link></section>

    <section className="why-section"><div><span className="kicker">Why PDFHope</span><h2>Serious tools.<br />Less friction.</h2><p>No account wall, noisy dashboard, or hidden workflow between you and the result.</p></div><div className="benefit-grid"><article><Zap /><h3>Fast by design</h3><p>The homepage stays light and loads PDF engines only when a workflow needs them.</p></article><article><LockKeyhole /><h3>Privacy-conscious</h3><p>Local tools keep file bytes in browser memory; server conversion is clearly labeled.</p></article><article><Smartphone /><h3>Made for any screen</h3><p>Responsive layouts and comfortable controls make quick edits practical on mobile.</p></article><article><Search /><h3>Easy to find</h3><p>Search, grouped navigation, favorites and recent tools shorten the path back.</p></article></div></section>

    <section className="seo-copy"><div><span className="kicker">Useful by default</span><h2>What makes a browser PDF tool different?</h2></div><p>Traditional online PDF tools often send documents to a remote server for processing. PDFHope’s supported local tools use JavaScript PDF libraries, browser canvas rendering, and local memory instead. Browser memory still has limits, especially for image-heavy documents, so the interface warns about large files and reports failures clearly.</p></section>
    <section className="faq home-faq"><span className="kicker">Common questions</span><h2>PDFHope FAQ</h2><details><summary>Is PDFHope free?</summary><p>The local tools are free to use and do not require an account. Server-based document conversion is subject to service availability and usage limits.</p></details><details><summary>Does PDFHope upload my files?</summary><p>Most PDF tools process files locally in your browser. Word to PDF and PDF to Word clearly identify their secure server conversion step and send the selected file only when you choose Convert.</p></details><details><summary>Which browsers work best?</summary><p>Current versions of Chrome, Edge, Firefox, and Safari are recommended. Large files work best on devices with more available memory.</p></details></section>
    <div className="ad-slot" aria-label="Reserved advertising space"><span>Reserved for a future clearly labeled advertisement</span></div>
  </main>
}
