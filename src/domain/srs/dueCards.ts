import type { Card } from '../cards/cardTypes'
import type { Deck } from '../decks/deckTypes'
import type { Lesson } from '../lessons/lessonTypes'
import type { ReviewState } from './srsTypes'

export type StudyItem = {
  card: Card
  reviewState: ReviewState
  deck: Deck
  lesson: Lesson
}

export function isStudyItemDue(item: StudyItem, now: string): boolean {
  return (
    item.reviewState.dueAt <= now &&
    !item.card.suspendedAt &&
    !item.card.archivedAt &&
    !item.lesson.archivedAt &&
    !item.deck.archivedAt
  )
}
