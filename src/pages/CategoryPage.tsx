import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { categoryHubById, categoryHubByPath } from '../data/categoryHubs'
import { navigationGroups } from '../data/navigation'
import { getTool } from '../data/tools'
import { SeoBreadcrumbs } from '../components/SeoBreadcrumbs'
import { ToolCard } from '../components/ToolCard'
import { guideBySlug } from '../data/guides'
import { useSeo } from '../hooks/useSeo'

const categoryGuideSlugs: Partial<Record<string, string[]>> = {
  intelligence: ['make-scanned-pdf-searchable'],
  optimize: ['compress-pdf-without-losing-searchable-text'],
  convert: ['pdf-to-word-formatting-changes', 'pdf-to-excel', 'pdf-to-powerpoint'],
  organize: ['merge-pdf'],
  security: ['pdf-password-security'],
}

export function CategoryPage() {
  const { pathname } = useLocation()
  const hub = categoryHubByPath[pathname]
  if (!hub) return <Navigate to="/404" replace />
  return <CategoryHubPage hub={hub} />
}

function CategoryHubPage({ hub }: { hub: (typeof categoryHubById)[keyof typeof categoryHubById] }) {
  useSeo(hub.title, hub.description, hub.path, true, true)
  const group = navigationGroups.find((entry) => entry.id === hub.id)!
  return <main className="listing-page category-page">
    <SeoBreadcrumbs path={hub.path} />
    <header className="listing-head category-head"><span className="kicker">PDFHope tool guide</span><h1>{hub.h1}</h1>{hub.intro.map((text) => <p key={text}>{text}</p>)}</header>
    <section className="category-tool-section" aria-label={`${hub.label} tools`}><div className="section-heading"><div><span className="kicker">Choose a workflow</span><h2>{hub.label} tools</h2></div></div><div className="listing-grid">{group.tools.map((tool) => <ToolCard key={tool.slug} tool={tool} catalog />)}</div></section>
    <section className="category-guidance"><span className="kicker">Practical guide</span><h2>How to choose the right tool</h2><div className="category-guidance-grid">{hub.choosing.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p><Link to={`/${item.tool}`}>{getTool(item.tool)?.name} <ArrowRight size={15} aria-hidden="true" /></Link></article>)}</div></section>
    <section className="category-context"><article><h2>Common use cases</h2><ul>{hub.useCases.map((item) => <li key={item}>{item}</li>)}</ul></article>{hub.details.map((item) => <article key={item.title}><h2>{item.title}</h2><p>{item.text}</p></article>)}</section>
    <section className="faq category-faq"><span className="kicker">Questions</span><h2>{hub.label} FAQ</h2>{hub.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
    {categoryGuideSlugs[hub.id] && <section className="category-learn"><span className="kicker">Learn more</span><h2>Guides</h2><div>{categoryGuideSlugs[hub.id]!.map((slug) => { const guide = guideBySlug[slug]; return <Link to={`/guides/${guide.slug}`} key={guide.slug}><strong>{guide.title}</strong><span>{guide.description}</span><ArrowRight size={17} aria-hidden="true" /></Link> })}</div></section>}
    <section className="category-related"><span className="kicker">Continue exploring</span><h2>Related PDF tool categories</h2><div>{hub.related.map((id) => { const related = categoryHubById[id]; return <Link to={related.path} key={id}><strong>{related.label}</strong><span>{related.description}</span><ArrowRight size={17} aria-hidden="true" /></Link> })}</div><p>Need the complete list? Browse <Link to="/tools">all PDF tools</Link>.</p></section>
  </main>
}
