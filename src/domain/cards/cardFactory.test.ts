import { describe, expect, it } from 'vitest'
import {
  createCardRecords,
  createImageCardRecords,
  createReverseCardRecords,
} from './cardFactory'

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
      stability: 0,
      difficulty: 5,
      lapses: 0,
      reviewCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  })

  it('creates image and reverse cards with independent review states', () => {
    const timestamp = '2026-06-22T12:00:00.000Z'
    const image = createImageCardRecords(
      {
        deckId: 'deck-1',
        lessonId: 'lesson-1',
        frontImageId: 'image-1',
        backDutch: 'huis',
        backMyLanguage: 'house',
        article: 'het',
        notes: '',
      },
      { cardId: 'image-card', reviewStateId: 'image-review' },
      timestamp,
    )
    const reverse = createReverseCardRecords(
      {
        ...image.card,
        id: 'source-card',
        cardType: 'myLanguageToDutch',
        frontText: 'house',
      },
      { cardId: 'reverse-card', reviewStateId: 'reverse-review' },
      timestamp,
    )

    expect(image.card).toMatchObject({
      cardType: 'imageToDutch',
      frontImageId: 'image-1',
    })
    expect(reverse.card).toMatchObject({
      id: 'reverse-card',
      cardType: 'dutchToMyLanguage',
      relatedCardId: 'source-card',
    })
    expect(reverse.reviewState.cardId).toBe('reverse-card')
  })
})
