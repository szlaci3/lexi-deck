import type { Card } from '../cards/cardTypes'
import type { Deck } from '../decks/deckTypes'
import type { Lesson } from '../lessons/lessonTypes'
import type { SourceImage } from '../media/mediaTypes'
import type { OcrText } from '../ocr/ocrTypes'
import type { AppSettings } from '../settings/settingsTypes'
import type { ReviewLog, ReviewState } from '../srs/srsTypes'
import type { VocabularyCandidate } from '../vocabulary/candidateTypes'
import type { KnownWord } from '../vocabulary/knownWords'

export type MediaExportManifestV2 = {
  appName: 'LexiDeck'
  appVersion: string
  exportVersion: 2
  exportedAt: string
  dataVersion: 4
  mediaIncluded: true
}

export type SourceImageExportRecord = Omit<SourceImage, 'blob'> & {
  mediaPath: string
}

export type MediaExportPackageV2 = {
  manifest: MediaExportManifestV2
  decks: Deck[]
  lessons: Lesson[]
  cards: Card[]
  reviewStates: ReviewState[]
  reviewLogs: ReviewLog[]
  settings: AppSettings[]
  knownWords: KnownWord[]
  sourceImages: SourceImageExportRecord[]
  ocrTexts: OcrText[]
  vocabularyCandidates: VocabularyCandidate[]
}

export type RestoredMediaPackageV2 = Omit<
  MediaExportPackageV2,
  'sourceImages'
> & {
  sourceImages: SourceImage[]
}
