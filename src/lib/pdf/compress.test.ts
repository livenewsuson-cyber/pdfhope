import { describe, expect, it } from 'vitest'
import { compressionSavings, DEFAULT_COMPRESSION_PRESET } from './compress'
import { getTool } from '../../data/tools'
import { navigationGroups } from '../../data/navigation'
import { homeToolFilters } from '../../data/homeToolFilters'
import { getToolPresentationGroup, getToolProcessingMode } from '../../data/toolPresentation'
import { toolSeo } from '../../data/toolSeo'

describe('Compress PDF integration', () => {
  it('calculates savings only from real byte counts', () => {
    expect(compressionSavings(1000, 400)).toEqual({ reductionBytes: 600, reductionPercent: 60, noGain: false })
    expect(compressionSavings(1000, 1200)).toEqual({ reductionBytes: 0, reductionPercent: 0, noGain: true })
    expect(compressionSavings(1000, 1000)).toEqual({ reductionBytes: 0, reductionPercent: 0, noGain: true })
  })

  it('exposes one local, popular tool in Optimize and preserves presentation ownership', () => {
    const tool = getTool('compress-pdf')!
    expect(tool.kind).toBe('compress')
    expect(tool.category).toBe('Optimize')
    expect(tool.popular).toBe(true)
    expect(getToolProcessingMode(tool.slug)).toBe('Local')
    expect(getToolPresentationGroup(tool.slug)).toBe('Optimize')
    expect(navigationGroups.find(group => group.id === 'optimize')!.tools.map(item => item.slug)).toEqual(['compress-pdf', 'pdf-size-breakdown'])
    expect(navigationGroups.flatMap(group => group.tools).filter(item => item.slug === 'pdf-size-breakdown')).toHaveLength(1)
    expect(getToolPresentationGroup('pdf-size-breakdown')).toBe('Optimize')
    expect(homeToolFilters.find(filter => filter.id === 'popular')!.tools).toContain(tool)
    expect(homeToolFilters.find(filter => filter.id === 'optimize')!.tools).toContain(tool)
    expect(toolSeo[tool.slug].seoTitle).toContain('Compress PDF')
    expect(toolSeo[tool.slug].faq.length).toBeGreaterThan(0)
    expect(DEFAULT_COMPRESSION_PRESET).toBe('recommended')
  })
})
