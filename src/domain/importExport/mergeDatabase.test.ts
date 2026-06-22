import { describe, expect, it } from 'vitest'
import type { ExportBundleV1 } from './exportTypes'
import { planDatabaseMerge } from './mergeDatabase'

const timestamp = '2026-06-23T08:00:00.000Z'

function bundle(overrides: Partial<ExportBundleV1> = {}): ExportBundleV1 {
  return {
    manifest: {
      appName: 'LexiDeck',
      appVersion: '0.5.0',
      exportVersion: 1,
      exportedAt: timestamp,
      dataVersion: 1,
      mediaIncluded: false,
    },
    decks: [],
    lessons: [],
    cards: [],
    reviewStates: [],
    reviewLogs: [],
    settings: [],
    knownWords: [],
    ...overrides,
  }
}

const deck = {
  id: 'deck-1',
  name: 'Dutch A1',
  description: 'Course',
  myLanguage: 'en' as const,
  targetLanguage: 'nl' as const,
  createdAt: timestamp,
  updatedAt: timestamp,
}
const lesson = {
  id: 'lesson-1',
  deckId: 'deck-1',
  title: 'Lesson 1',
  description: 'Intro',
  order: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
}
const card = {
  id: 'card-1',
  deckId: 'deck-1',
  lessonId: 'lesson-1',
  cardType: 'myLanguageToDutch' as const,
  frontText: 'cucumber',
  backDutch: 'komkommer',
  backMyLanguage: 'cucumber',
  article: 'de' as const,
  notes: '',
  createdAt: timestamp,
  updatedAt: timestamp,
}

describe('planDatabaseMerge', () => {
  it('remaps conflicting IDs and preserves relationships', () => {
    const existing = bundle({ decks: [deck], lessons: [lesson], cards: [card] })
    const imported = bundle({
      decks: [{ ...deck, name: 'Another deck' }],
      lessons: [{ ...lesson, title: 'Imported lesson' }],
      cards: [{ ...card, frontText: 'gherkin', backMyLanguage: 'gherkin' }],
    })
    let id = 0
    const plan = planDatabaseMerge(
      existing,
      imported,
      () => `new-${++id}`,
      timestamp,
    )

    expect(plan.summary.remappedIds).toBe(3)
    expect(plan.bundle.lessons[0]?.deckId).toBe(plan.bundle.decks[0]?.id)
    expect(plan.bundle.cards[0]?.lessonId).toBe(plan.bundle.lessons[0]?.id)
  })

  it('renames conflicting deck names', () => {
    const plan = planDatabaseMerge(
      bundle({ decks: [deck] }),
      bundle({ decks: [{ ...deck, id: 'deck-2' }] }),
      () => 'new-id',
      timestamp,
    )

    expect(plan.bundle.decks[0]?.name).toBe('Dutch A1 (Imported)')
    expect(plan.summary.renamedDecks).toBe(1)
  })

  it('uses numbered imported names when needed', () => {
    const plan = planDatabaseMerge(
      bundle({
        decks: [
          deck,
          { ...deck, id: 'deck-2', name: 'Dutch A1 (Imported)' },
        ],
      }),
      bundle({ decks: [{ ...deck, id: 'deck-3' }] }),
      () => 'new-id',
      timestamp,
    )

    expect(plan.bundle.decks[0]?.name).toBe('Dutch A1 (Imported 2)')
  })

  it('skips exact duplicate cards and their review progress', () => {
    const plan = planDatabaseMerge(
      bundle({ decks: [deck], lessons: [lesson], cards: [card] }),
      bundle({
        decks: [{ ...deck, id: 'deck-import' }],
        lessons: [
          { ...lesson, id: 'lesson-import', deckId: 'deck-import' },
        ],
        cards: [
          {
            ...card,
            id: 'card-import',
            deckId: 'deck-import',
            lessonId: 'lesson-import',
          },
        ],
        reviewStates: [
          {
            id: 'state-import',
            cardId: 'card-import',
            dueAt: timestamp,
            intervalDays: 3,
            lapses: 0,
            reviewCount: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }),
      () => 'new-id',
      timestamp,
    )

    expect(plan.bundle.cards).toHaveLength(0)
    expect(plan.bundle.reviewStates).toHaveLength(0)
    expect(plan.summary.skippedExactCards).toBe(1)
  })

  it('imports and reports possible duplicates', () => {
    const plan = planDatabaseMerge(
      bundle({ decks: [deck], lessons: [lesson], cards: [card] }),
      bundle({
        decks: [{ ...deck, id: 'deck-import', name: 'Dutch B1' }],
        lessons: [
          { ...lesson, id: 'lesson-import', deckId: 'deck-import' },
        ],
        cards: [
          {
            ...card,
            id: 'card-import',
            deckId: 'deck-import',
            lessonId: 'lesson-import',
            frontText: '黄瓜',
            backMyLanguage: '黄瓜',
          },
        ],
      }),
      () => 'new-id',
      timestamp,
    )

    expect(plan.bundle.cards).toHaveLength(1)
    expect(plan.summary.possibleDuplicateCards).toBe(1)
  })

  it('preserves imported review progress for an imported remapped card', () => {
    const plan = planDatabaseMerge(
      bundle({ cards: [{ ...card }] }),
      bundle({
        decks: [{ ...deck, id: 'deck-import', name: 'Dutch B1' }],
        lessons: [
          { ...lesson, id: 'lesson-import', deckId: 'deck-import' },
        ],
        cards: [
          {
            ...card,
            id: 'card-1',
            deckId: 'deck-import',
            lessonId: 'lesson-import',
            frontText: 'gherkin',
            backMyLanguage: 'gherkin',
          },
        ],
        reviewStates: [
          {
            id: 'state-1',
            cardId: 'card-1',
            dueAt: timestamp,
            intervalDays: 7,
            stability: 7,
            difficulty: 5,
            lapses: 1,
            reviewCount: 4,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }),
      () => 'remapped-card',
      timestamp,
    )

    expect(plan.bundle.cards[0]?.id).toBe('remapped-card')
    expect(plan.bundle.reviewStates[0]).toMatchObject({
      cardId: 'remapped-card',
      intervalDays: 7,
      reviewCount: 4,
    })
  })
})
