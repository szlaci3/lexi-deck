import type { ReviewLog, StudyRating } from '../../domain/srs/srsTypes'
import type { StudyItem } from '../../domain/srs/dueCards'
import type { SourceImage } from '../../domain/media/mediaTypes'
import { isStudyItemDue } from '../../domain/srs/dueCards'
import { scheduleReview } from '../../domain/srs/scheduleReview'
import {
  applyDailyStudyLimits,
  type DailyStudyLimits,
  type DailyStudyUsage,
  type LimitedStudySelection,
} from '../../domain/srs/studyLimits'
import { getLocalDayBounds } from '../../utils/dates'
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
  rating: StudyRating
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
  const imageIds = filteredCards.flatMap((card) =>
    card.frontImageId ? [card.frontImageId] : [],
  )
  const images = await db.sourceImages.bulkGet([...new Set(imageIds)])
  const imageById = new Map(
    images
      .filter(
        (image): image is SourceImage =>
          image !== undefined && !image.archivedAt,
      )
      .map((image) => [image.id, image]),
  )

  return filteredCards
    .flatMap((card): StudyItem[] => {
      const deck = deckById.get(card.deckId)
      const lesson = lessonById.get(card.lessonId)
      const reviewState = stateByCardId.get(card.id)

      return deck && lesson && reviewState
        ? [
            {
              card,
              deck,
              lesson,
              reviewState,
              image: card.frontImageId
                ? imageById.get(card.frontImageId)
                : undefined,
            },
          ]
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

export async function listLimitedStudyItems({
  now,
  deckId,
  limits,
}: DueStudyOptions & {
  limits: DailyStudyLimits
}): Promise<LimitedStudySelection> {
  const [items, usage] = await Promise.all([
    listDueStudyItems({ now, deckId }),
    getDailyStudyUsage(new Date(now)),
  ])
  return applyDailyStudyLimits(items, usage, limits)
}

export async function getDailyStudyUsage(
  now: Date,
): Promise<DailyStudyUsage> {
  const bounds = getLocalDayBounds(now)
  const logs = await db.reviewLogs
    .where('reviewedAt')
    .between(bounds.start, bounds.end, true, false)
    .toArray()

  return logs.reduce<DailyStudyUsage>(
    (usage, log) => {
      if (log.previousIntervalDays === 0) {
        usage.newCards += 1
      } else {
        usage.reviews += 1
      }
      return usage
    },
    { newCards: 0, reviews: 0 },
  )
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
