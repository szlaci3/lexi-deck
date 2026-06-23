import { describe, expect, it } from 'vitest'
import { buildExportBundle } from './exportDatabase'
import {
  parseAndValidateImportJson,
  validateImportBundle,
} from './validateImportBundle'

const timestamp = '2026-06-23T08:00:00.000Z'
const validBundle = buildExportBundle(
  {
    decks: [],
    lessons: [],
    cards: [],
    reviewStates: [],
    reviewLogs: [],
    settings: [],
    knownWords: [],
  },
  '0.5.0',
  timestamp,
)

describe('validateImportBundle', () => {
  it('accepts a valid export bundle', () => {
    expect(validateImportBundle(validBundle)).toEqual({
      valid: true,
      bundle: validBundle,
    })
  })

  it('rejects a missing manifest', () => {
    const result = validateImportBundle({ ...validBundle, manifest: undefined })
    expect(result.valid).toBe(false)
  })

  it('rejects invalid JSON', () => {
    expect(parseAndValidateImportJson('{not json')).toEqual({
      valid: false,
      errors: ['The selected file is not valid JSON.'],
    })
  })

  it('rejects unsupported export versions', () => {
    const result = validateImportBundle({
      ...validBundle,
      manifest: { ...validBundle.manifest, exportVersion: 2 },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toContain('This export version is not supported.')
    }
  })

  it('rejects missing required tables', () => {
    const withoutCards = { ...validBundle } as Partial<typeof validBundle>
    delete withoutCards.cards
    const result = validateImportBundle(withoutCards)
    expect(result.valid).toBe(false)
  })

  it('rejects records with invalid required fields', () => {
    const result = validateImportBundle({
      ...validBundle,
      decks: [{ id: 'deck-1' }],
    })
    expect(result.valid).toBe(false)
  })

  it('rejects cards whose lesson is outside their deck', () => {
    const result = validateImportBundle({
      ...validBundle,
      decks: [
        {
          id: 'deck-1',
          name: 'Deck',
          description: 'Description',
          myLanguage: 'en',
          targetLanguage: 'nl',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: 'deck-2',
          name: 'Deck 2',
          description: 'Description',
          myLanguage: 'en',
          targetLanguage: 'nl',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      lessons: [
        {
          id: 'lesson-1',
          deckId: 'deck-1',
          title: 'Lesson',
          description: 'Description',
          order: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      cards: [
        {
          id: 'card-1',
          deckId: 'deck-2',
          lessonId: 'lesson-1',
          cardType: 'myLanguageToDutch',
          frontText: 'house',
          backDutch: 'huis',
          backMyLanguage: 'house',
          article: 'het',
          notes: '',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('accepts related reverse and image card types', () => {
    const deck = {
      id: 'deck-1',
      name: 'Deck',
      description: 'Description',
      myLanguage: 'en' as const,
      targetLanguage: 'nl' as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const lesson = {
      id: 'lesson-1',
      deckId: deck.id,
      title: 'Lesson',
      description: 'Description',
      order: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const cards = [
      {
        id: 'card-1',
        deckId: deck.id,
        lessonId: lesson.id,
        cardType: 'myLanguageToDutch' as const,
        frontText: 'house',
        backDutch: 'huis',
        backMyLanguage: 'house',
        article: 'het' as const,
        notes: '',
        relatedCardId: 'card-2',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'card-2',
        deckId: deck.id,
        lessonId: lesson.id,
        cardType: 'dutchToMyLanguage' as const,
        frontText: 'house',
        backDutch: 'huis',
        backMyLanguage: 'house',
        article: 'het' as const,
        notes: '',
        relatedCardId: 'card-1',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'card-3',
        deckId: deck.id,
        lessonId: lesson.id,
        cardType: 'imageToDutch' as const,
        frontText: '',
        frontImageId: 'image-1',
        backDutch: 'huis',
        backMyLanguage: '',
        article: 'het' as const,
        notes: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]

    expect(
      validateImportBundle({
        ...validBundle,
        decks: [deck],
        lessons: [lesson],
        cards,
      }).valid,
    ).toBe(true)
  })
})
