import { ArrowRight, BookOpen, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SeoBreadcrumbs } from '../components/SeoBreadcrumbs'
import { guideReadingMinutes, guides } from '../data/guides'
import { useSeo } from '../hooks/useSeo'

const guidesIndexSeo = {
  title: 'PDF Guides – OCR, Compression & Conversion Help | PDFHope',
  description: 'Practical PDF guides covering OCR, scanned documents, compression, conversion, privacy and common PDF problems.',
}

export function GuidesPage() {
  useSeo(guidesIndexSeo.title, guidesIndexSeo.description, '/guides', true, true)
  return <main className="listing-page guides-page">
    <SeoBreadcrumbs path="/guides" />
    <header className="listing-head guides-head">
      <span className="kicker">PDFHope learning center</span>
      <h1>PDF Guides</h1>
      <p>Practical guides for working with PDFs, scanned documents, compression, conversion and document privacy.</p>
    </header>
    {[
      { heading: 'Convert', topics: ['Conversion'] },
      { heading: 'Optimize', topics: ['Compression'] },
      { heading: 'OCR & Analysis', topics: ['OCR'] },
      { heading: 'Organize', topics: ['Organize'] },
      { heading: 'Security', topics: ['Security'] },
    ].map((group) => {
      const groupGuides = guides.filter((guide) => group.topics.includes(guide.topic))
      if (!groupGuides.length) return null
      return <section className="guide-card-section" aria-labelledby={`guide-group-${group.heading.toLowerCase().replace(/[^a-z]+/g, '-')}`} key={group.heading}>
        <div className="guide-group-heading"><span className="kicker">Browse by topic</span><h2 id={`guide-group-${group.heading.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{group.heading}</h2></div>
        <div className="guide-card-grid">{groupGuides.map((guide) => <Link className="guide-card" to={`/guides/${guide.slug}`} key={guide.slug}>
        <span className="guide-card-icon" aria-hidden="true"><BookOpen size={22} /></span>
        <span className="category-pill">{guide.topic}</span>
        <h2>{guide.title}</h2>
        <p>{guide.description}</p>
        <span className="guide-card-meta"><Clock3 size={15} aria-hidden="true" /> {guideReadingMinutes(guide)} min read</span>
        <span className="link-label">Read guide <ArrowRight size={16} aria-hidden="true" /></span>
        </Link>)}</div>
      </section>
    })}
    <section className="guides-index-note">
      <h2>Understand the file before changing it</h2>
      <p>These guides explain what PDF tools can preserve, what they must reconstruct, and where quality or privacy tradeoffs appear. When you are ready to work on a file, each guide points to the relevant PDFHope tool.</p>
    </section>
  </main>
}
