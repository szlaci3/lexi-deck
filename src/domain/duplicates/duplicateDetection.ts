import type { Card, CreateCardInput } from '../cards/cardTypes'
import { formatDutchText } from '../cards/cardDisplay'
import { normalizeDutchNoun, normalizeText } from './normalizeText'

export type DuplicateStatus = 'unique' | 'possibleDuplicate' | 'duplicate'

export type CardDuplicateMatch = {
  card: Card
  status: Exclude<DuplicateStatus, 'unique'>
  reason: 'exactPair' | 'sameDutchInDeck' | 'sameDutchAcrossDecks'
}

export type DuplicateDetectionResult = {
  status: DuplicateStatus
  matches: CardDuplicateMatch[]
}

export function detectCardDuplicates(
  candidate: CreateCardInput,
  existingCards: Card[],
  excludeCardId?: string,
): DuplicateDetectionResult {
  const candidateFront = normalizeText(candidate.frontText)
  const candidateDutch = normalizeDutchNoun(
    formatDutchText(candidate.article, candidate.backDutch),
  )
  const matches: CardDuplicateMatch[] = []

  for (const card of existingCards) {
    if (card.id === excludeCardId || card.archivedAt) {
      continue
    }

    const existingFront = normalizeText(card.frontText)
    const existingDutch = normalizeDutchNoun(formatDutchText(card.article, card.backDutch))

    if (candidateFront === existingFront && candidateDutch === existingDutch) {
      matches.push({ card, status: 'duplicate', reason: 'exactPair' })
      continue
    }

    if (candidateDutch === existingDutch) {
      matches.push({
        card,
        status: card.deckId === candidate.deckId ? 'duplicate' : 'possibleDuplicate',
        reason:
          card.deckId === candidate.deckId
            ? 'sameDutchInDeck'
            : 'sameDutchAcrossDecks',
      })
    }
  }

  const status = matches.some((match) => match.status === 'duplicate')
    ? 'duplicate'
    : matches.length > 0
      ? 'possibleDuplicate'
      : 'unique'

  return { status, matches }
}
