import type { ReviewState } from '../srs/srsTypes'
import type {
  Card,
  CreateCardInput,
  CreateImageCardInput,
} from './cardTypes'

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
  const reviewState = createInitialReviewState(
    ids.reviewStateId,
    card.id,
    timestamp,
  )

  return { card, reviewState }
}

export function createImageCardRecords(
  input: CreateImageCardInput,
  ids: CardRecordIds,
  timestamp: string,
): CardRecords {
  const card: Card = {
    id: ids.cardId,
    deckId: input.deckId,
    lessonId: input.lessonId,
    cardType: 'imageToDutch',
    frontText: input.backMyLanguage,
    frontImageId: input.frontImageId,
    backDutch: input.backDutch,
    backMyLanguage: input.backMyLanguage,
    article: input.article,
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    card,
    reviewState: createInitialReviewState(
      ids.reviewStateId,
      card.id,
      timestamp,
    ),
  }
}

export function createReverseCardRecords(
  source: Card,
  ids: CardRecordIds,
  timestamp: string,
): CardRecords {
  const card: Card = {
    ...source,
    id: ids.cardId,
    cardType: 'dutchToMyLanguage',
    relatedCardId: source.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    suspendedAt: undefined,
    archivedAt: undefined,
  }

  return {
    card,
    reviewState: createInitialReviewState(
      ids.reviewStateId,
      card.id,
      timestamp,
    ),
  }
}

function createInitialReviewState(
  id: string,
  cardId: string,
  timestamp: string,
): ReviewState {
  return {
    id,
    cardId,
    dueAt: timestamp,
    intervalDays: 0,
    stability: 0,
    difficulty: 5,
    lapses: 0,
    reviewCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
