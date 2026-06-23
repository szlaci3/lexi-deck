import { describe, expect, it } from 'vitest'
import type { Card } from '../cards/cardTypes'
import type { VocabularyCandidate } from './candidateTypes'
import { classifyCandidateDuplicate } from './candidateDuplicates'
import type { KnownWord } from './knownWords'

const timestamp = '2026-06-23T10:00:00.000Z'
const candidate: VocabularyCandidate = {
  id: 'candidate-1',
  deckId: 'deck-1',
  lessonId: 'lesson-1',
  sourceImageId: 'image-1',
  ocrTextId: 'ocr-1',
  rawText: 'komkommer',
  normalizedText: 'komkommer',
  candidateType: 'word',
  article: 'de',
  myLanguageMeaning: 'cucumber',
  status: 'pending',
  duplicateStatus: 'unique',
  createdAt: timestamp,
  updatedAt: timestamp,
}

function card(deckId: string): Card {
  return {
    id: `card-${deckId}`,
    deckId,
    lessonId: 'lesson-x',
    cardType: 'myLanguageToDutch',
    frontText: 'cucumber',
    backDutch: 'komkommer',
    backMyLanguage: 'cucumber',
    article: 'de',
    notes: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

describe('candidate duplicate classification', () => {
  it('flags matching cards in the current deck', () => {
    expect(classifyCandidateDuplicate(candidate, [card('deck-1')], [], [])).toBe(
      'duplicateInDeck',
    )
  })

  it('reports matching cards in another deck as possible duplicates', () => {
    expect(classifyCandidateDuplicate(candidate, [card('deck-2')], [], [])).toBe(
      'possibleDuplicate',
    )
  })

  it('prioritizes known words', () => {
    const knownWord: KnownWord = {
      id: 'known-1',
      normalizedText: 'komkommer',
      displayText: 'de komkommer',
      article: 'de',
      source: 'candidate',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    expect(
      classifyCandidateDuplicate(candidate, [card('deck-1')], [], [knownWord]),
    ).toBe('known')
  })
})
