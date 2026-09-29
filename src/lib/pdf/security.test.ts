import { describe, expect, it } from 'vitest'
import { getTool } from '../../data/tools'
import { navigationGroups } from '../../data/navigation'
import { homeToolFilters } from '../../data/homeToolFilters'
import { getToolPresentationGroup, getToolProcessingMode } from '../../data/toolPresentation'
import { toolSeo } from '../../data/toolSeo'
import { passwordStrength, randomOwnerPassword, securityError, validateProtectionPassword } from './security'
import { placementToPdf } from './signature'

describe('Security tools', () => {
  it('registers three local Secure tools and one Security presentation group', () => {
    const group = navigationGroups.find((item) => item.id === 'security')!
    expect(group.tools.map((item) => item.slug)).toEqual(['protect-pdf', 'unlock-pdf', 'sign-pdf', 'pdf-metadata-cleaner'])
    expect(navigationGroups.find((item) => item.id === 'advanced')!.tools.some((item) => item.slug === 'pdf-metadata-cleaner')).toBe(false)
    expect(homeToolFilters.find((item) => item.id === 'security')?.tools).toEqual(group.tools)
    for (const [slug, kind] of [['protect-pdf', 'protect'], ['unlock-pdf', 'unlock'], ['sign-pdf', 'sign']]) {
      expect(getTool(slug)?.kind).toBe(kind)
      expect(getTool(slug)?.category).toBe('Secure')
      expect(getToolPresentationGroup(slug)).toBe('Security')
      expect(getToolProcessingMode(slug)).toBe('Local')
      expect(toolSeo[slug].seoTitle).toBeTruthy()
      expect(toolSeo[slug].faq.length).toBeGreaterThan(0)
    }
  })

  it('validates passwords and creates a 32-byte random owner secret', () => {
    expect(validateProtectionPassword('short', 'short')).toMatch(/8/)
    expect(validateProtectionPassword('long enough', 'different')).toMatch(/match/)
    expect(validateProtectionPassword('long enough', 'long enough')).toBe('')
    expect(passwordStrength('short')).toBe('Weak')
    expect(passwordStrength('long-enough-123')).toBe('Strong')
    expect(randomOwnerPassword(Uint8Array.from({ length: 32 }, (_, index) => index))).toMatch(/^[0-9a-f]{64}$/)
  })

  it('never exposes raw qpdf password errors', () => {
    const message = securityError(new Error('qpdf --password=secret exited with status 2'), 'unlock')
    expect(message).toBe('That password could not open this PDF.')
    expect(message).not.toContain('secret')
    expect(securityError(Object.assign(new Error('2'), { code: 'QPDF_EXEC_FAILED', exitCode: null }), 'unlock')).toBe('That password could not open this PDF.')
  })
})

describe('Signature placement', () => {
  it('maps a visible rectangle to PDF coordinates without changing the page index', () => {
    const result = placementToPdf({ id: 1, pageIndex: 2, x: .25, y: .5, width: .2, height: .1, image: '' }, { width: 600, height: 800, rotation: 0, toPdfPoint: (x, y) => [x, 800 - y] })
    expect(result.x).toBe(150)
    expect(result.y).toBe(320)
    expect(result.width).toBe(120)
    expect(result.height).toBe(80)
  })
})
