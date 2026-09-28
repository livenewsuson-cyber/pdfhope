import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { homeToolFilters } from '../data/homeToolFilters'
import { navigationGroups } from '../data/navigation'
import { tools } from '../data/tools'
import { HomeToolDiscovery } from './HomeToolDiscovery'

describe('homepage tool discovery', () => {
  it('prerenders Popular by default using only popular tools', () => {
    const html = renderToStaticMarkup(<MemoryRouter><HomeToolDiscovery /></MemoryRouter>)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Popular PDF tools')
    expect(html).toContain('href="/tools"')
    for (const tool of tools) {
      expect(html.includes(`href="/${tool.slug}"`)).toBe(Boolean(tool.popular))
    }
    expect(homeToolFilters.find((filter) => filter.id === 'popular')?.tools).toEqual(tools.filter((tool) => tool.popular))
    expect(homeToolFilters.find((filter) => filter.id === 'all')?.tools).toEqual(tools)
  })

  it.each(navigationGroups)('matches the $label navigation group', (group) => {
    expect(homeToolFilters.find((filter) => filter.id === group.id)?.tools).toEqual(group.tools)
  })

  it('does not expose empty category filters', () => {
    expect(homeToolFilters.every((filter) => filter.tools.length > 0)).toBe(true)
  })
})
