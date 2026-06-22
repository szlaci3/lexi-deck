export type CardType = 'myLanguageToDutch'
export type DutchArticle = 'de' | 'het' | 'none' | 'unknown'

export const dutchArticleLabels: Record<DutchArticle, string> = {
  de: 'de',
  het: 'het',
  none: 'No article',
  unknown: 'Unknown article',
}

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

export type CreateCardInput = Pick<
  Card,
  'deckId' | 'lessonId' | 'frontText' | 'backDutch' | 'article' | 'notes'
>

export type UpdateCardInput = Pick<
  Card,
  'lessonId' | 'frontText' | 'backDutch' | 'article' | 'notes'
>
