import type { ReviewState } from '../srs/srsTypes'
import type { Card, CreateCardInput } from './cardTypes'

type CardRecordIds = {
  cardId: string
  reviewStateId: string
}

export type CardRecords = {
  card: Card
  reviewState: ReviewState
}

export function createCardRecords(
  input: CreateCardInput,
  ids: CardRecordIds,
  timestamp: string,
): CardRecords {
  const card: Card = {
    id: ids.cardId,
    deckId: input.deckId,
    lessonId: input.lessonId,
    cardType: 'myLanguageToDutch',
    frontText: input.frontText,
    backMyLanguage: input.frontText,
    backDutch: input.backDutch,
    article: input.article,
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const reviewState: ReviewState = {
    id: ids.reviewStateId,
    cardId: card.id,
    dueAt: timestamp,
    intervalDays: 0,
    lapses: 0,
    reviewCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return { card, reviewState }
}
