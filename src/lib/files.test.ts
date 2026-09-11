import { describe,expect,it } from 'vitest'
import { parsePageSelection,safeBaseName } from './files'

describe('page selection',()=>{
  it('parses mixed single pages and ranges',()=>expect(parsePageSelection('1, 3, 5-7',8)).toEqual([0,2,4,5,6]))
  it('uses every page for a blank selection',()=>expect(parsePageSelection('',3)).toEqual([0,1,2]))
  it('rejects pages beyond the document',()=>expect(()=>parsePageSelection('1-9',3)).toThrow(/outside/))
  it('handles strange and Unicode filenames safely',()=>expect(safeBaseName('Résumé final (v2).pdf')).toBe('Résumé-final-v2'))
})
