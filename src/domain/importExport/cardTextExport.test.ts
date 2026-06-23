import { describe, expect, it } from 'vitest'
import type { ExportableCard } from './cardTextExport'
import {
  createCardExportFilename,
  createCardExportRows,
  serializeAnkiText,
  serializeCardCsv,
  serializeCardTsv,
} from './cardTextExport'

const timestamp = '2026-06-23T10:00:00.000Z'

function record(
  overrides: Partial<ExportableCard['card']> = {},
): ExportableCard {
  return {
    deck: {
      id: 'deck-1',
      name: 'Dutch A1',
      description: '',
      myLanguage: 'en',
      targetLanguage: 'nl',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    lesson: {
      id: 'lesson-1',
      deckId: 'deck-1',
      title: 'Lesson 1',
      description: '',
      order: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    card: {
      id: 'card-1',
      deckId: 'deck-1',
      lessonId: 'lesson-1',
      cardType: 'myLanguageToDutch',
      frontText: 'cucumber',
      backMyLanguage: 'cucumber',
      backDutch: 'komkommer',
      article: 'de',
      notes: 'A "green", watery vegetable',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    },
  }
}

describe('card text export', () => {
  it('creates structured rows with Dutch display and raw text', () => {
    expect(createCardExportRows([record()])[0]).toEqual({
      myLanguageText: 'cucumber',
      dutchDisplayText: 'de komkommer',
      rawDutchText: 'komkommer',
      article: 'de',
      deck: 'Dutch A1',
      lesson: 'Lesson 1',
      notes: 'A "green", watery vegetable',
      cardType: 'myLanguageToDutch',
      imageFileName: '',
    })
  })

  it('escapes CSV and TSV separators, quotes, and newlines', () => {
    const rows = createCardExportRows([record()])
    expect(serializeCardCsv(rows)).toContain(
      '"A ""green"", watery vegetable"',
    )
    expect(
      serializeCardTsv(
        createCardExportRows([record({ notes: 'line 1\tline 2' })]),
      ),
    ).toContain('"line 1\tline 2"')
  })

  it('creates Anki headers and direction-aware image fallbacks', () => {
    const text = serializeAnkiText([
      {
        ...record({
          cardType: 'imageToDutch',
          frontText: '',
          frontImageId: 'image-1',
          backMyLanguage: 'house',
          backDutch: 'huis',
          article: 'het',
        }),
        imageFileName: 'page-optimized.jpg',
      },
    ])

    expect(text).toContain('#separator:Tab')
    expect(text).toContain('#deck column:4')
    expect(text).toContain('[Image not included: page-optimized.jpg]\thet huis')
  })

  it('exports reverse cards with Dutch on the front', () => {
    const text = serializeAnkiText([
      record({
        cardType: 'dutchToMyLanguage',
        backDutch: 'huis',
        backMyLanguage: 'house',
        article: 'het',
      }),
    ])

    expect(text).toContain('het huis\thouse')
  })

  it('creates timestamped filenames', () => {
    expect(
      createCardExportFilename('csv', new Date('2026-06-23T10:04:00')),
    ).toBe('lexideck-cards-2026-06-23-10-04.csv')
  })
})
