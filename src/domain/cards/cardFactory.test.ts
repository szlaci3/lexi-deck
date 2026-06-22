import { describe, expect, it } from 'vitest'
import { createCardRecords } from './cardFactory'

describe('createCardRecords', () => {
  it('creates a My Language to Dutch card and immediately due review state', () => {
    const timestamp = '2026-06-22T12:00:00.000Z'
    const result = createCardRecords(
      {
        deckId: 'deck-1',
        lessonId: 'lesson-1',
        frontText: '黄瓜',
        backDutch: 'komkommer',
        article: 'de',
        notes: '',
      },
      { cardId: 'card-1', reviewStateId: 'review-1' },
      timestamp,
    )

    expect(result.card).toMatchObject({
      id: 'card-1',
      cardType: 'myLanguageToDutch',
      frontText: '黄瓜',
      backMyLanguage: '黄瓜',
      backDutch: 'komkommer',
      article: 'de',
    })
    expect(result.reviewState).toEqual({
      id: 'review-1',
      cardId: 'card-1',
      dueAt: timestamp,
      intervalDays: 0,
      lapses: 0,
      reviewCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  })
})
