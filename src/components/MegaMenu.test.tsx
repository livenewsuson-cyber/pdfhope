import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { navigationGroups } from '../data/navigation'
import { MegaMenu, type MegaMenuMode } from './MegaMenu'

const renderMenu = (mode: MegaMenuMode) => renderToStaticMarkup(
  <MemoryRouter><MegaMenu mode={mode} onNavigate={() => {}} /></MemoryRouter>,
)

describe('desktop mega menu content', () => {
  it('shows every group and the all-tools link in the full menu', () => {
    const html = renderMenu('all')
    expect(html.match(/class="mega-menu-group"/g)).toHaveLength(navigationGroups.length)
    expect(html).toContain('Explore all tools')
    for (const group of navigationGroups) expect(html).toContain(`href="/${group.tools[0].slug}"`)
  })

  it.each(navigationGroups)('shows only $label tools in its category panel', (group) => {
    const html = renderMenu(group.id)
    expect(html.match(/class="mega-menu-group"/g)).toHaveLength(1)
    expect(html).not.toContain('Explore all tools')
    expect(html.match(/class="mega-menu-links"/g)).toHaveLength(1)
    for (const tool of group.tools) expect(html).toContain(`href="/${tool.slug}"`)
    for (const other of navigationGroups.filter((item) => item.id !== group.id)) {
      expect(html).not.toContain(`href="/${other.tools[0].slug}"`)
    }
  })
})
