import type { DutchArticle } from '../cards/cardTypes'

export type KnownWord = {
  id: string
  normalizedText: string
  displayText: string
  article: DutchArticle
  source: 'manual' | 'candidate'
  createdAt: string
  updatedAt: string
}
