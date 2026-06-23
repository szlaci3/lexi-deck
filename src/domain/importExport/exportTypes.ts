import type { Card } from '../cards/cardTypes'
import type { Deck } from '../decks/deckTypes'
import type { Lesson } from '../lessons/lessonTypes'
import type { AppSettings } from '../settings/settingsTypes'
import type { ReviewLog, ReviewState } from '../srs/srsTypes'
import type { KnownWord } from '../vocabulary/knownWords'

export type ExportManifestV1 = {
  appName: 'LexiDeck'
  appVersion: string
  exportVersion: 1
  exportedAt: string
  dataVersion: 1
  mediaIncluded: false
}

export type ExportBundleV1 = {
  manifest: ExportManifestV1
  decks: Deck[]
  lessons: Lesson[]
  cards: Card[]
  reviewStates: ReviewState[]
  reviewLogs: ReviewLog[]
  settings: AppSettings[]
  knownWords: KnownWord[]
}

export type ExportBundle = ExportBundleV1

export type ExportTables = Omit<ExportBundleV1, 'manifest'>

export type ImportPreview = {
  exportedAt: string
  exportVersion: number
  mediaIncluded: boolean
  deckCount: number
  lessonCount: number
  cardCount: number
  reviewStateCount: number
  reviewLogCount: number
  settingsCount: number
  knownWordCount: number
}

export type ImportSummary = {
  decks: number
  lessons: number
  cards: number
  reviewStates: number
  reviewLogs: number
  settings: number
  knownWords: number
}

export type MediaImportSummary = ImportSummary & {
  sourceImages: number
  ocrTexts: number
  vocabularyCandidates: number
}

export type MergeSummary = ImportSummary & {
  renamedDecks: number
  remappedIds: number
  skippedExactCards: number
  possibleDuplicateCards: number
  skippedSettings: number
  skippedKnownWords: number
}

export type MergePlan = {
  bundle: ExportBundleV1
  summary: MergeSummary
  renamedDecks: Array<{ originalName: string; importedName: string }>
  possibleDuplicateCardIds: string[]
}
