import { describe, expect, it } from 'vitest'
import { removeOwnerRestrictions } from './security'
describe('permission authorization',()=>{
  it('blocks modification before reading input without authorization',async()=>{
    await expect(removeOwnerRestrictions(new File(['invalid'],'not-a-pdf.pdf'),false)).rejects.toThrow('Confirm you own')
  })
})
