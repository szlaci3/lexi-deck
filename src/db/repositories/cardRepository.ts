import type {
  Card,
  CreateCardInput,
  UpdateCardInput,
} from '../../domain/cards/cardTypes'
import { createCardRecords } from '../../domain/cards/cardFactory'
import { validateCardInput } from '../../domain/cards/cardValidation'
import {
  detectCardDuplicates,
  type DuplicateDetectionResult,
} from '../../domain/duplicates/duplicateDetection'
import { nowIso } from '../../utils/dates'
import { createId } from '../../utils/ids'
import { db } from '../dexie'

export class CardNotFoundError extends Error {
  constructor() {
    super('This card could not be found.')
    this.name = 'CardNotFoundError'
  }
}

export class CardLocationError extends Error {
  constructor() {
    super('The selected deck or lesson is unavailable.')
    this.name = 'CardLocationError'
  }
}

function validatedInput(input: CreateCardInput | UpdateCardInput) {
  const result = validateCardInput(input)

  if (!result.valid) {
    throw new Error(Object.values(result.errors)[0] ?? 'The card is invalid.')
  }

  return result.value
}

async function assertActiveLocation(
  deckId: string,
  lessonId: string,
): Promise<void> {
  const [deck, lesson] = await Promise.all([
    db.decks.get(deckId),
    db.lessons.get(lessonId),
  ])

  if (
    !deck ||
    deck.archivedAt ||
    !lesson ||
    lesson.archivedAt ||
    lesson.deckId !== deckId
  ) {
    throw new CardLocationError()
  }
}

export async function createCardWithInitialReviewState(
  input: CreateCardInput,
): Promise<Card> {
  const value = validatedInput(input)
  await assertActiveLocation(input.deckId, value.lessonId)

  const timestamp = nowIso()
  const { card, reviewState } = createCardRecords(
    { deckId: input.deckId, ...value },
    { cardId: createId(), reviewStateId: createId() },
    timestamp,
  )

  await db.transaction('rw', db.cards, db.reviewStates, async () => {
    await db.cards.add(card)
    await db.reviewStates.add(reviewState)
  })

  return card
}

export async function updateCard(
  id: string,
  input: UpdateCardInput,
): Promise<Card> {
  const existingCard = await getCardById(id)

  if (!existingCard) {
    throw new CardNotFoundError()
  }

  const value = validatedInput(input)
  await assertActiveLocation(existingCard.deckId, value.lessonId)

  const updatedCard: Card = {
    ...existingCard,
    lessonId: value.lessonId,
    frontText: value.frontText,
    backMyLanguage: value.frontText,
    backDutch: value.backDutch,
    article: value.article,
    notes: value.notes,
    updatedAt: nowIso(),
  }

  await db.cards.put(updatedCard)
  return updatedCard
}

export async function getCardById(id: string): Promise<Card | undefined> {
  return db.cards.get(id)
}

export async function listActiveCardsByDeckId(deckId: string): Promise<Card[]> {
  const cards = await db.cards
    .where('deckId')
    .equals(deckId)
    .filter((card) => !card.archivedAt)
    .toArray()

  return cards.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )
}

export async function listActiveCardsByLessonId(
  lessonId: string,
): Promise<Card[]> {
  const cards = await db.cards
    .where('lessonId')
    .equals(lessonId)
    .filter((card) => !card.archivedAt)
    .toArray()

  return cards.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )
}

export async function archiveCard(id: string): Promise<void> {
  const card = await getCardById(id)

  if (!card) {
    throw new CardNotFoundError()
  }

  const timestamp = nowIso()
  await db.cards.put({
    ...card,
    archivedAt: timestamp,
    updatedAt: timestamp,
  })
}

export async function suspendCard(id: string): Promise<void> {
  const card = await getCardById(id)

  if (!card) {
    throw new CardNotFoundError()
  }

  const timestamp = nowIso()
  await db.cards.put({
    ...card,
    suspendedAt: timestamp,
    updatedAt: timestamp,
  })
}

export async function unsuspendCard(id: string): Promise<void> {
  const card = await getCardById(id)

  if (!card) {
    throw new CardNotFoundError()
  }

  const activeCard: Card = {
    ...card,
    suspendedAt: undefined,
    updatedAt: nowIso(),
  }
  await db.cards.put({
    ...activeCard,
  })
}

export async function findCardDuplicates(
  input: CreateCardInput,
  excludeCardId?: string,
): Promise<DuplicateDetectionResult> {
  const activeCards = await db.cards
    .filter((card) => !card.archivedAt)
    .toArray()

  return detectCardDuplicates(input, activeCards, excludeCardId)
}
