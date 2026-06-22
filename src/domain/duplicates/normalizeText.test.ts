import { describe, expect, it } from 'vitest'
import { normalizeDutchNoun, normalizeText } from './normalizeText'

describe('normalizeText', () => {
  it('normalizes casing, punctuation, and repeated whitespace', () => {
    expect(normalizeText('  Hallo,   WERELD!  ')).toBe('hallo wereld')
  })

  it('preserves Simplified Chinese prompt text', () => {
    expect(normalizeText('  黄瓜  ')).toBe('黄瓜')
  })
})

describe('normalizeDutchNoun', () => {
  it('removes a leading Dutch article for noun comparison', () => {
    expect(normalizeDutchNoun('De komkommer')).toBe('komkommer')
    expect(normalizeDutchNoun('het huis')).toBe('huis')
  })

  it('does not alter words that merely contain an article fragment', () => {
    expect(normalizeDutchNoun('denken')).toBe('denken')
  })
})
