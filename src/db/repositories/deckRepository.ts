import type {
  CreateDeckInput,
  Deck,
  DeckSummary,
  UpdateDeckInput,
} from '../../domain/decks/deckTypes'
import { validateDeckInput } from '../../domain/decks/deckValidation'
import { nowIso } from '../../utils/dates'
import { createId } from '../../utils/ids'
import { db } from '../dexie'

export class DeckNotFoundError extends Error {
  constructor() {
    super('This deck could not be found.')
    this.name = 'DeckNotFoundError'
  }
}

export class DeckLanguageLockedError extends Error {
  constructor() {
    super('My Language cannot be changed after cards exist in this deck.')
    this.name = 'DeckLanguageLockedError'
  }
}

function validatedInput(input: CreateDeckInput | UpdateDeckInput): CreateDeckInput {
  const result = validateDeckInput(input)

  if (!result.valid) {
    throw new Error(Object.values(result.errors)[0] ?? 'The deck is invalid.')
  }

  return result.value
}

export async function createDeck(input: CreateDeckInput): Promise<Deck> {
  const value = validatedInput(input)
  const timestamp = nowIso()
  const deck: Deck = {
    id: createId(),
    name: value.name,
    description: value.description,
    myLanguage: value.myLanguage,
    targetLanguage: 'nl',
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.decks.add(deck)
  return deck
}

export async function updateDeck(
  id: string,
  input: UpdateDeckInput,
): Promise<Deck> {
  const existingDeck = await getDeckById(id)

  if (!existingDeck) {
    throw new DeckNotFoundError()
  }

  const value = validatedInput({
    name: input.name ?? existingDeck.name,
    description: input.description ?? existingDeck.description,
    myLanguage: input.myLanguage ?? existingDeck.myLanguage,
  })

  if (
    value.myLanguage !== existingDeck.myLanguage &&
    (await countActiveCardsByDeckId(id)) > 0
  ) {
    throw new DeckLanguageLockedError()
  }

  const updatedDeck: Deck = {
    ...existingDeck,
    ...value,
    updatedAt: nowIso(),
  }

  await db.decks.put(updatedDeck)
  return updatedDeck
}

export async function getDeckById(id: string): Promise<Deck | undefined> {
  return db.decks.get(id)
}

export async function listActiveDecks(): Promise<Deck[]> {
  const decks = await db.decks.filter((deck) => !deck.archivedAt).toArray()

  return decks.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )
}

export async function archiveDeck(id: string): Promise<void> {
  const deck = await getDeckById(id)

  if (!deck) {
    throw new DeckNotFoundError()
  }

  const timestamp = nowIso()
  await db.decks.put({
    ...deck,
    archivedAt: timestamp,
    updatedAt: timestamp,
  })
}

export async function getDeckSummary(
  id: string,
): Promise<DeckSummary | undefined> {
  const deck = await getDeckById(id)

  if (!deck || deck.archivedAt) {
    return undefined
  }

  return buildDeckSummary(deck)
}

export async function listActiveDeckSummaries(): Promise<DeckSummary[]> {
  return Promise.all((await listActiveDecks()).map(buildDeckSummary))
}

async function buildDeckSummary(deck: Deck): Promise<DeckSummary> {
  const [lessonCount, cards] = await Promise.all([
    db.lessons
      .where('deckId')
      .equals(deck.id)
      .filter((lesson) => !lesson.archivedAt)
      .count(),
    db.cards
      .where('deckId')
      .equals(deck.id)
      .filter((card) => !card.archivedAt)
      .toArray(),
  ])
  const activeCards = cards.filter((card) => !card.suspendedAt)
  const dueCount = await countDueCards(activeCards.map((card) => card.id))

  return {
    deck,
    lessonCount,
    cardCount: cards.length,
    dueCount,
  }
}

async function countActiveCardsByDeckId(deckId: string): Promise<number> {
  return db.cards
    .where('deckId')
    .equals(deckId)
    .filter((card) => !card.archivedAt)
    .count()
}

async function countDueCards(cardIds: string[]): Promise<number> {
  if (cardIds.length === 0) {
    return 0
  }

  const now = nowIso()
  return db.reviewStates
    .where('cardId')
    .anyOf(cardIds)
    .filter((reviewState) => reviewState.dueAt <= now)
    .count()
}
