import { describe,expect,it } from 'vitest'
import { hashSimilarity,isLikelyBlank } from './render'

describe('visual heuristics',()=>{
  it('flags only near-white pages without text as likely blank',()=>{expect(isLikelyBlank(.997,0)).toBe(true);expect(isLikelyBlank(.997,2)).toBe(false);expect(isLikelyBlank(.98,0)).toBe(false)})
  it('calculates duplicate-page signature similarity',()=>{expect(hashSimilarity('11110000','11110000')).toBe(1);expect(hashSimilarity('11110000','11100000')).toBe(.875);expect(hashSimilarity('1','11')).toBe(0)})
})
