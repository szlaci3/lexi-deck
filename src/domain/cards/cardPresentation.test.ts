import { describe, expect, it } from 'vitest'
import type { Card } from './cardTypes'
import { getCardPresentation } from './cardPresentation'

const base: Card = {
  id: 'card-1',
  deckId: 'deck-1',
  lessonId: 'lesson-1',
  cardType: 'myLanguageToDutch',
  frontText: 'house',
  backDutch: 'huis',
  backMyLanguage: 'house',
  article: 'het',
  notes: '',
  createdAt: '2026-06-23T10:00:00.000Z',
  updatedAt: '2026-06-23T10:00:00.000Z',
}

describe('getCardPresentation', () => {
  it('presents reverse cards with Dutch first', () => {
    expect(
      getCardPresentation({ ...base, cardType: 'dutchToMyLanguage' }),
    ).toMatchObject({
      promptText: 'het huis',
      promptLanguage: 'dutch',
      answerText: 'house',
      answerLanguage: 'myLanguage',
      dutchOnPrompt: true,
      dutchOnAnswer: false,
    })
  })

  it('presents image cards with an image prompt and Dutch answer', () => {
    expect(
      getCardPresentation({
        ...base,
        cardType: 'imageToDutch',
        frontImageId: 'image-1',
      }),
    ).toMatchObject({
      promptKind: 'image',
      promptImageId: 'image-1',
      answerText: 'het huis',
      secondaryAnswerText: 'house',
    })
  })
})
