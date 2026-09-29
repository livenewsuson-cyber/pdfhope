import { describe, expect, it } from 'vitest'
import { calculateMegaMenuCenter } from './megaMenuPosition'

describe('category mega-menu positioning', () => {
  it('centers on a trigger when there is room', () => {
    expect(calculateMegaMenuCenter({ triggerCenter: 700, menuWidth: 420, containerWidth: 1440 })).toBe(700)
  })

  it('clamps a wide Convert panel inside the left edge', () => {
    expect(calculateMegaMenuCenter({ triggerCenter: 200, menuWidth: 740, containerWidth: 1440 })).toBe(386)
  })

  it('clamps an Advanced panel inside the right edge', () => {
    expect(calculateMegaMenuCenter({ triggerCenter: 1350, menuWidth: 650, containerWidth: 1440 })).toBe(1099)
  })
})
