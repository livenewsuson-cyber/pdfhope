import { ArrowRight, BookOpen, Clock3 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { SeoBreadcrumbs } from '../components/SeoBreadcrumbs'
import { guideBySlug, guideReadingMinutes, guideWordCount, guides, type Guide, type GuideSection } from '../data/guides'
import { useSeo } from '../hooks/useSeo'
import { NotFound } from './InfoPage'

function Section({ section }: { section: GuideSection }) {
  return <section>
    <h2>{section.heading}</h2>
    {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    {section.subheadings?.map((item) => <div className="guide-subsection" key={item.heading}>
      <h3>{item.heading}</h3>
      {item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {item.bullets && <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
    </div>)}
    {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
    {section.steps && <ol className="guide-steps">{section.steps.map((step) => <li key={step.title}><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>}
  </section>
}

export function GuidePage() {
  const { slug = '' } = useParams()
  const guide = guideBySlug[slug]
  if (!guide) return <NotFound />
  return <GuideArticle guide={guide} />
}

function GuideArticle({ guide }: { guide: Guide }) {
  const path = `/guides/${guide.slug}`
  useSeo(guide.seoTitle, guide.description, path, true, true)
  const otherGuides = guides.filter((item) => item.slug !== guide.slug)
  return <main className="guide-page">
    <SeoBreadcrumbs path={path} />
    <article className="guide-article">
      <header className="guide-hero">
        <span className="kicker">{guide.topic} guide</span>
        <h1>{guide.title}</h1>
        <p className="guide-lede">{guide.intro}</p>
        <div className="guide-byline"><span>By PDFHope</span><span><Clock3 size={15} aria-hidden="true" /> {guideReadingMinutes(guide)} min read</span><span>{guideWordCount(guide).toLocaleString()} words</span></div>
      </header>
      <aside className="guide-answer" aria-label="Short answer">
        <strong>Short answer</strong>
        <p>{guide.shortAnswer}</p>
      </aside>
      <div className="guide-body">
        {guide.sections.map((section) => <Section section={section} key={section.heading} />)}
        <section className="guide-primary-cta" aria-labelledby="guide-primary-cta-title">
          <span className="guide-card-icon" aria-hidden="true"><BookOpen size={22} /></span>
          <div><h2 id="guide-primary-cta-title">Ready to work on your PDF?</h2><p>{guide.primaryTool.description}</p></div>
          <Link className="primary-button" to={guide.primaryTool.path}>{guide.primaryTool.label} <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
        <section className="faq guide-faq">
          <span className="kicker">Common questions</span>
          <h2>Frequently asked questions</h2>
          {guide.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
        </section>
        <section className="guide-related-tools">
          <span className="kicker">Related workflows</span>
          <h2>Related PDF tools</h2>
          <div>{guide.relatedTools.map((item) => <Link to={item.path} key={item.path}><strong>{item.label}</strong><span>{item.description}</span><ArrowRight size={16} aria-hidden="true" /></Link>)}</div>
        </section>
        <section className="guide-more">
          <h2>More PDF guides</h2>
          <div>{otherGuides.map((item) => <Link to={`/guides/${item.slug}`} key={item.slug}><span>{item.topic}</span><strong>{item.title}</strong></Link>)}</div>
          <Link className="guide-all-link" to="/guides">View all PDF guides <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      </div>
    </article>
  </main>
}
