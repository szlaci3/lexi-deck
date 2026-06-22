export type CardType = 'myLanguageToDutch'
export type DutchArticle = 'de' | 'het' | 'none' | 'unknown'

export type Card = {
  id: string
  deckId: string
  lessonId: string
  cardType: CardType
  frontText: string
  frontImageId?: string
  backDutch: string
  backMyLanguage: string
  article: DutchArticle
  notes: string
  audioAssetId?: string
  sourceCandidateId?: string
  createdAt: string
  updatedAt: string
  suspendedAt?: string
  archivedAt?: string
}
