import { describe, expect, it } from 'vitest'
import type { Card, CreateCardInput } from '../cards/cardTypes'
import { detectCardDuplicates } from './duplicateDetection'

const baseCard: Card = {
  id: 'card-1',
  deckId: 'deck-1',
  lessonId: 'lesson-1',
  cardType: 'myLanguageToDutch',
  frontText: 'cucumber',
  backMyLanguage: 'cucumber',
  backDutch: 'komkommer',
  article: 'de',
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const candidate: CreateCardInput = {
  deckId: 'deck-1',
  lessonId: 'lesson-1',
  frontText: 'Cucumber',
  backDutch: 'de komkommer',
  article: 'unknown',
  notes: '',
}

describe('detectCardDuplicates', () => {
  it('detects an exact normalized pair', () => {
    const result = detectCardDuplicates(candidate, [baseCard])

    expect(result.status).toBe('duplicate')
    expect(result.matches[0]?.reason).toBe('exactPair')
  })

  it('reports the same Dutch answer in another deck as possible', () => {
    const result = detectCardDuplicates(
      { ...candidate, deckId: 'deck-2', frontText: '黄瓜' },
      [baseCard],
    )

    expect(result.status).toBe('possibleDuplicate')
    expect(result.matches[0]?.reason).toBe('sameDutchAcrossDecks')
  })

  it('keeps different expressions separate', () => {
    const result = detectCardDuplicates(
      { ...candidate, frontText: 'leave', backDutch: 'weggaan' },
      [baseCard],
    )

    expect(result).toEqual({ status: 'unique', matches: [] })
  })
})
