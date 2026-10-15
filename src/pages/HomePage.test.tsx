import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'

describe('homepage-only release', () => {
  it('preserves one H1, discovery, search and SEO content', () => {
    const html = renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('Every <span class="hero-emphasis">PDF tool</span> you need.')
    expect(html).toContain('id="home-search"')
    expect(html).toContain('Popular PDF tools')
    expect(html).toContain('PDFHope FAQ')
    expect(html).toContain('href="/merge-pdf"')
    expect(html).toContain('href="/guides"')
  })
  it('advertises the Agent without a link, chat control or fake response', () => {
    const html = renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>)
    const panel = html.match(/<aside class="hero-agent-card"[\s\S]*?<\/aside>/)?.[0]
    expect(panel).toBeDefined()
    expect(panel).toContain('AI Agent')
    expect(panel).toContain('Get Help PDF Using AI')
    expect(panel).toContain('Coming Soon')
    expect(panel).not.toMatch(/<(a|input|textarea|button)\b/)
    expect(html).not.toContain('/ai-agent')
  })
})
