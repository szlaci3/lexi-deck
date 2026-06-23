import type { Card } from '../cards/cardTypes'
import { formatDutchText } from '../cards/cardDisplay'
import { normalizeDutchNoun } from '../duplicates/normalizeText'
import type { KnownWord } from './knownWords'
import type {
  CandidateDuplicateStatus,
  VocabularyCandidate,
} from './candidateTypes'

type CandidateDuplicateInput = Pick<
  VocabularyCandidate,
  'id' | 'deckId' | 'lessonId' | 'rawText' | 'article'
>

export function classifyCandidateDuplicate(
  candidate: CandidateDuplicateInput,
  cards: Card[],
  candidates: VocabularyCandidate[],
  knownWords: KnownWord[],
): CandidateDuplicateStatus {
  const normalized = normalizeDutchNoun(
    formatDutchText(candidate.article, candidate.rawText),
  )

  if (knownWords.some((word) => word.normalizedText === normalized)) {
    return 'known'
  }

  const matchingCards = cards.filter(
    (card) =>
      !card.archivedAt &&
      normalizeDutchNoun(formatDutchText(card.article, card.backDutch)) ===
        normalized,
  )

  if (matchingCards.some((card) => card.deckId === candidate.deckId)) {
    return 'duplicateInDeck'
  }

  if (
    candidates.some(
      (existing) =>
        existing.id !== candidate.id &&
        existing.lessonId === candidate.lessonId &&
        existing.status !== 'rejected' &&
        existing.status !== 'known' &&
        existing.status !== 'converted' &&
        existing.normalizedText === normalized,
    )
  ) {
    return 'duplicateCandidate'
  }

  return matchingCards.length > 0 ? 'possibleDuplicate' : 'unique'
}
