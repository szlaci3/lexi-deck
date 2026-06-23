import type { DutchArticle } from '../cards/cardTypes'

export type CandidateType = 'word' | 'expression'
export type CandidateStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'known'
  | 'converted'
export type CandidateDuplicateStatus =
  | 'unique'
  | 'duplicateInDeck'
  | 'possibleDuplicate'
  | 'duplicateCandidate'
  | 'known'

export type VocabularyCandidate = {
  id: string
  deckId: string
  lessonId: string
  sourceImageId: string
  ocrTextId: string
  rawText: string
  normalizedText: string
  candidateType: CandidateType
  article: DutchArticle
  myLanguageMeaning: string
  status: CandidateStatus
  duplicateStatus: CandidateDuplicateStatus
  createdAt: string
  updatedAt: string
}

export type CandidateDraft = Pick<
  VocabularyCandidate,
  'rawText' | 'normalizedText' | 'candidateType' | 'article' | 'myLanguageMeaning'
>

export type UpdateCandidateInput = Pick<
  VocabularyCandidate,
  'rawText' | 'article' | 'myLanguageMeaning'
>
