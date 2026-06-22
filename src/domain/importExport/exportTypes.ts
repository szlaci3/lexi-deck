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
