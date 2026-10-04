import { Link } from 'react-router-dom'
import { ToolIcon } from './ToolIcon'
import { toolSeo } from '../data/toolSeo'
import { toolHowToHeading } from '../data/toolHeadings'
import { contextualLinks } from '../data/contextualLinks'
import { guideBySlug } from '../data/guides'

const toolGuideSlugs: Record<string, string> = {
  'ocr-pdf': 'make-scanned-pdf-searchable',
  'compress-pdf': 'compress-pdf-without-losing-searchable-text',
  'pdf-to-word': 'pdf-to-word-formatting-changes',
}

export function ToolSeoContent({ slug }: { slug: string }) {
  const content = toolSeo[slug]
  if (!content) return null
  return <div className="tool-seo-content">
    <section className="seo-overview"><div><span className="kicker">About this tool</span><h2>{content.intro}</h2>{content.overview.map((p)=><p key={p}>{p}</p>)}</div><aside><h3>Common uses</h3><ul>{content.useCases.map((item)=><li key={item}>{item}</li>)}</ul></aside></section>
    <section className="tool-copy"><article><span className="kicker">How it works</span><h2>{toolHowToHeading(slug)}</h2><ol>{content.howItWorks.map((item,index)=><li key={item}><span>{index+1}</span><p>{item}</p></li>)}</ol></article><aside><h3>Supported files</h3><p>{content.supportedFormats}</p><h3>Privacy and processing</h3><p>{content.privacy}</p></aside></section>
    {contextualLinks[slug] && <section className="seo-workflow-links"><h2>Plan the next step</h2>{contextualLinks[slug].map((item) => <p key={`${item.slug}-${item.label}`}>{item.before}<Link to={`/${item.slug}`}>{item.label}</Link>{item.after}</p>)}</section>}
    {toolGuideSlugs[slug] && <section className="tool-guide-link"><span className="kicker">Learn more</span><h2>{guideBySlug[toolGuideSlugs[slug]].title}</h2><p>{guideBySlug[toolGuideSlugs[slug]].shortAnswer}</p><Link to={`/guides/${toolGuideSlugs[slug]}`}>Read the guide →</Link></section>}
    <section className="seo-detail-grid"><article><h2>Features</h2><ul>{content.features.map((item)=><li key={item}>{item}</li>)}</ul></article><article><h2>Output and quality</h2><p>{content.qualityOrOutputNotes}</p><h3>Limitations</h3><p>{content.limitations}</p></article><article><h2>Tips for better results</h2><ul>{content.tips.map((item)=><li key={item}>{item}</li>)}</ul></article></section>
    <section className="faq"><span className="kicker">Help</span><h2>Troubleshooting</h2>{content.troubleshooting.map((item)=><details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}<h2>Frequently asked questions</h2>{content.faq.map((item)=><details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
    <section className="related"><h2>Related PDF tools</h2><div>{content.relatedTools.filter((item)=>toolSeo[item.slug]).map((item)=><Link key={item.slug} to={`/${item.slug}`}><ToolIcon slug={item.slug} compact/><span><strong>{item.label}</strong><small>{item.description}</small></span></Link>)}</div></section>
  </div>
}
