import type { ReviewLog, SrsRating } from '../../domain/srs/srsTypes'
import type { StudyItem } from '../../domain/srs/dueCards'
import { isStudyItemDue } from '../../domain/srs/dueCards'
import { scheduleReview } from '../../domain/srs/scheduleReview'
import { createId } from '../../utils/ids'
import { db } from '../dexie'

export class ReviewStateNotFoundError extends Error {
  constructor() {
    super('The review state for this card could not be found.')
    this.name = 'ReviewStateNotFoundError'
  }
}

type DueStudyOptions = {
  now: string
  deckId?: string
}

type SubmitReviewInput = {
  cardId: string
  rating: SrsRating
  reviewedAt: string
  responseTimeMs: number
}

export async function listDueStudyItems({
  now,
  deckId,
}: DueStudyOptions): Promise<StudyItem[]> {
  const dueStates = await db.reviewStates
    .where('dueAt')
    .belowOrEqual(now)
    .toArray()

  if (dueStates.length === 0) {
    return []
  }

  const cards = (
    await db.cards.bulkGet(dueStates.map((state) => state.cardId))
  ).filter((card) => card !== undefined)
  const filteredCards = deckId
    ? cards.filter((card) => card.deckId === deckId)
    : cards

  if (filteredCards.length === 0) {
    return []
  }

  const [decks, lessons] = await Promise.all([
    db.decks.bulkGet([...new Set(filteredCards.map((card) => card.deckId))]),
    db.lessons.bulkGet([
      ...new Set(filteredCards.map((card) => card.lessonId)),
    ]),
  ])
  const deckById = new Map(
    decks.filter((deck) => deck !== undefined).map((deck) => [deck.id, deck]),
  )
  const lessonById = new Map(
    lessons
      .filter((lesson) => lesson !== undefined)
      .map((lesson) => [lesson.id, lesson]),
  )
  const stateByCardId = new Map(
    dueStates.map((reviewState) => [reviewState.cardId, reviewState]),
  )

  return filteredCards
    .flatMap((card): StudyItem[] => {
      const deck = deckById.get(card.deckId)
      const lesson = lessonById.get(card.lessonId)
      const reviewState = stateByCardId.get(card.id)

      return deck && lesson && reviewState
        ? [{ card, deck, lesson, reviewState }]
        : []
    })
    .filter((item) => isStudyItemDue(item, now))
    .sort((left, right) =>
      left.reviewState.dueAt.localeCompare(right.reviewState.dueAt),
    )
}

export async function countDueCards(
  now: string,
  deckId?: string,
): Promise<number> {
  return (await listDueStudyItems({ now, deckId })).length
}

export async function submitReview({
  cardId,
  rating,
  reviewedAt,
  responseTimeMs,
}: SubmitReviewInput): Promise<ReviewLog> {
  return db.transaction(
    'rw',
    db.reviewStates,
    db.reviewLogs,
    async () => {
      const reviewState = await db.reviewStates
        .where('cardId')
        .equals(cardId)
        .first()

      if (!reviewState) {
        throw new ReviewStateNotFoundError()
      }

      const scheduled = scheduleReview({
        reviewState,
        rating,
        reviewedAt,
      })
      const reviewLog: ReviewLog = {
        id: createId(),
        cardId,
        reviewedAt,
        rating,
        previousDueAt: reviewState.dueAt,
        nextDueAt: scheduled.reviewState.dueAt,
        previousIntervalDays: reviewState.intervalDays,
        nextIntervalDays: scheduled.reviewState.intervalDays,
        responseTimeMs,
      }

      await db.reviewStates.put(scheduled.reviewState)
      await db.reviewLogs.add(reviewLog)

      return reviewLog
    },
  )
}
