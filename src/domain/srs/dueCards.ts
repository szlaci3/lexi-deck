import type { Card } from '../cards/cardTypes'
import type { Deck } from '../decks/deckTypes'
import type { Lesson } from '../lessons/lessonTypes'
import type { SourceImage } from '../media/mediaTypes'
import type { ReviewState } from './srsTypes'

export type StudyItem = {
  card: Card
  reviewState: ReviewState
  deck: Deck
  lesson: Lesson
  image?: SourceImage
}

export function isStudyItemEligible(item: StudyItem): boolean {
  return (
    !item.card.suspendedAt &&
    !item.card.archivedAt &&
    !item.lesson.archivedAt &&
    !item.deck.archivedAt
  )
}

export function isStudyItemDue(item: StudyItem, now: string): boolean {
  return isStudyItemEligible(item) && item.reviewState.dueAt <= now
}
