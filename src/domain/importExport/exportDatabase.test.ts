import { describe, expect, it } from 'vitest'
import {
  buildExportBundle,
  createExportFilename,
  createImportPreview,
} from './exportDatabase'

const emptyTables = {
  decks: [],
  lessons: [],
  cards: [],
  reviewStates: [],
  reviewLogs: [],
  settings: [],
  knownWords: [],
}

describe('export database helpers', () => {
  it('builds a versioned LexiDeck manifest without media', () => {
    const bundle = buildExportBundle(
      emptyTables,
      '0.5.0',
      '2026-06-23T08:07:00.000Z',
    )

    expect(bundle.manifest).toEqual({
      appName: 'LexiDeck',
      appVersion: '0.5.0',
      exportVersion: 1,
      exportedAt: '2026-06-23T08:07:00.000Z',
      dataVersion: 1,
      mediaIncluded: false,
    })
  })

  it('creates the required backup filename', () => {
    expect(createExportFilename('2026-06-23T08:07:00.000Z')).toBe(
      'lexideck-backup-2026-06-23-10-07.json',
    )
  })

  it('creates an import preview', () => {
    const bundle = buildExportBundle(
      { ...emptyTables, decks: [{} as never], cards: [{} as never] },
      '0.5.0',
      '2026-06-23T08:07:00.000Z',
    )

    expect(createImportPreview(bundle)).toMatchObject({
      deckCount: 1,
      cardCount: 1,
      mediaIncluded: false,
    })
  })
})
