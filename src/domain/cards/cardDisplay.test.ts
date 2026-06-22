import { describe, expect, it } from 'vitest'
import { formatDutchText } from './cardDisplay'

describe('formatDutchText', () => {
  it.each([
    ['de', 'komkommer', 'de komkommer'],
    ['het', 'huis', 'het huis'],
    ['none', 'ik heb dorst', 'ik heb dorst'],
    ['unknown', 'woord', 'woord'],
  ] as const)('formats %s Dutch text', (article, dutch, expected) => {
    expect(formatDutchText(article, dutch)).toBe(expected)
  })

  it('does not duplicate an article typed into the Dutch field', () => {
    expect(formatDutchText('de', 'de komkommer')).toBe('de komkommer')
    expect(formatDutchText('het', 'het huis')).toBe('het huis')
  })
})
