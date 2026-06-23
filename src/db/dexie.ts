import Dexie, { type EntityTable } from 'dexie'
import type { Card } from '../domain/cards/cardTypes'
import type { Deck } from '../domain/decks/deckTypes'
import type { Lesson } from '../domain/lessons/lessonTypes'
import type { AppSettings } from '../domain/settings/settingsTypes'
import type { ReviewLog, ReviewState } from '../domain/srs/srsTypes'
import type { KnownWord } from '../domain/vocabulary/knownWords'
import type { VocabularyCandidate } from '../domain/vocabulary/candidateTypes'
import type { SourceImage } from '../domain/media/mediaTypes'
import type { OcrText } from '../domain/ocr/ocrTypes'
import {
  databaseSchemaV1,
  databaseSchemaV2,
  databaseSchemaV3,
  databaseSchemaV4,
} from './schema'

export class LexiDeckDatabase extends Dexie {
  decks!: EntityTable<Deck, 'id'>
  lessons!: EntityTable<Lesson, 'id'>
  cards!: EntityTable<Card, 'id'>
  reviewStates!: EntityTable<ReviewState, 'id'>
  reviewLogs!: EntityTable<ReviewLog, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  knownWords!: EntityTable<KnownWord, 'id'>
  sourceImages!: EntityTable<SourceImage, 'id'>
  ocrTexts!: EntityTable<OcrText, 'id'>
  vocabularyCandidates!: EntityTable<VocabularyCandidate, 'id'>

  constructor() {
    super('lexideck')
    this.version(1).stores(databaseSchemaV1)
    this.version(2).stores(databaseSchemaV2)
    this.version(3).stores(databaseSchemaV3)
    this.version(4).stores(databaseSchemaV4)
  }
}

export const db = new LexiDeckDatabase()

export async function openLexiDeckDatabase(): Promise<void> {
  if (!globalThis.indexedDB) {
    throw new Error('IndexedDB is not available in this browser.')
  }

  await db.open()
}
