import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { navigationGroups } from '../data/navigation'
import { getToolBadge, getToolPresentationGroup, getToolProcessingMode } from '../data/toolPresentation'
import { getTool, tools } from '../data/tools'
import { ToolCard } from './ToolCard'

function markup(slug: string, catalog = false, showBadge = true) {
  return renderToStaticMarkup(<MemoryRouter><ToolCard tool={getTool(slug)!} catalog={catalog} showBadge={showBadge} /></MemoryRouter>)
}

describe('shared tool cards', () => {
  it('renders a crawlable compact link with a badge only for popular tools', () => {
    const popular = markup('merge-pdf')
    expect(popular).toContain('href="/merge-pdf"')
    expect(popular).toContain('Popular')
    expect(popular).toContain('Combine files in your chosen order')
    expect(popular).not.toContain('<button')
    expect(markup('blank-page-detector')).not.toContain('tool-card-badge')
    expect(markup('merge-pdf', false, false)).not.toContain('tool-card-badge')
    expect(getToolBadge(getTool('merge-pdf')!)).toBe('popular')
    expect(getToolBadge(getTool('blank-page-detector')!)).toBeNull()
  })

  it('uses the same link and icon language for catalog cards', () => {
    const html = markup('pdf-health-check', true)
    expect(html).toContain('href="/pdf-health-check"')
    expect(html).toContain('class="tool-card catalog-card"')
    expect(html).toContain('<h2>PDF Health Check</h2>')
    expect(html).toContain('PDF Intelligence')
    expect(html).toContain('Local')
    expect(html).not.toContain('<button')
  })

  it('labels all Office conversion as secure server conversion', () => {
    const serverTools = ['word-to-pdf', 'pdf-to-word', 'excel-to-pdf', 'powerpoint-to-pdf', 'pdf-to-excel', 'pdf-to-powerpoint']
    for (const slug of serverTools) {
      expect(getToolProcessingMode(slug)).toBe('Secure conversion')
      expect(markup(slug, true)).toContain('Secure conversion')
    }
    for (const tool of tools.filter((item) => !serverTools.includes(item.slug))) {
      expect(getToolProcessingMode(tool.slug)).toBe('Local')
      expect(markup(tool.slug, true)).not.toContain('Secure conversion')
    }
  })

  it('matches catalog presentation labels to navigation groups', () => {
    for (const group of navigationGroups) {
      for (const tool of group.tools) expect(getToolPresentationGroup(tool.slug)).toBe(group.label)
    }
    expect(getToolPresentationGroup('pdf-metadata-cleaner')).toBe('Security')
    expect(getToolPresentationGroup('duplicate-page-finder')).toBe('PDF Intelligence')
  })
})
