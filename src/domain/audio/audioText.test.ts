import { describe, expect, it } from 'vitest'
import { getDutchAudioText } from './audioText'

describe('getDutchAudioText', () => {
  it.each([
    ['de', 'komkommer', 'de komkommer'],
    ['het', 'huis', 'het huis'],
    ['none', 'ik heb dorst', 'ik heb dorst'],
    ['unknown', 'woord', 'woord'],
  ] as const)('prepares %s Dutch audio', (article, backDutch, expected) => {
    expect(getDutchAudioText({ article, backDutch })).toBe(expected)
  })
})
