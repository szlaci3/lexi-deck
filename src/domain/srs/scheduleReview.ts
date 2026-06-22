import type {
  ReviewState,
  ScheduleReviewInput,
  ScheduledReviewResult,
  SrsRating,
} from './srsTypes'

const minutesPerDay = 24 * 60
const againIntervalDays = 10 / minutesPerDay

const firstReviewIntervals: Record<SrsRating, number> = {
  again: againIntervalDays,
  hard: 1,
  good: 3,
  easy: 7,
}

export function scheduleReview({
  reviewState,
  rating,
  reviewedAt,
}: ScheduleReviewInput): ScheduledReviewResult {
  const isFirstReview = reviewState.reviewCount === 0
  const nextIntervalDays = isFirstReview
    ? firstReviewIntervals[rating]
    : getLaterInterval(reviewState.intervalDays, rating)
  const nextDueAt = addInterval(reviewedAt, nextIntervalDays)

  return {
    reviewState: {
      ...reviewState,
      dueAt: nextDueAt,
      lastReviewedAt: reviewedAt,
      intervalDays: nextIntervalDays,
      stability: nextIntervalDays,
      difficulty: reviewState.difficulty ?? 5,
      lapses: reviewState.lapses + (rating === 'again' ? 1 : 0),
      reviewCount: reviewState.reviewCount + 1,
      updatedAt: reviewedAt,
    },
    intervalLabel: formatInterval(nextIntervalDays),
  }
}

export function previewReviewIntervals(
  reviewState: ReviewState,
  reviewedAt: string,
): Record<SrsRating, ScheduledReviewResult> {
  return {
    again: scheduleReview({ reviewState, rating: 'again', reviewedAt }),
    hard: scheduleReview({ reviewState, rating: 'hard', reviewedAt }),
    good: scheduleReview({ reviewState, rating: 'good', reviewedAt }),
    easy: scheduleReview({ reviewState, rating: 'easy', reviewedAt }),
  }
}

export function formatInterval(intervalDays: number): string {
  if (intervalDays < 1) {
    return `${Math.round(intervalDays * minutesPerDay)} min`
  }

  const days = Math.round(intervalDays)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

function getLaterInterval(
  previousIntervalDays: number,
  rating: SrsRating,
): number {
  if (rating === 'again') {
    return againIntervalDays
  }

  const multipliers: Record<Exclude<SrsRating, 'again'>, number> = {
    hard: 1.2,
    good: 2.2,
    easy: 3.5,
  }
  const minimums: Record<Exclude<SrsRating, 'again'>, number> = {
    hard: 1,
    good: 3,
    easy: 7,
  }

  return Math.round(
    Math.max(minimums[rating], previousIntervalDays * multipliers[rating]),
  )
}

function addInterval(reviewedAt: string, intervalDays: number): string {
  const milliseconds = intervalDays * 24 * 60 * 60 * 1000
  return new Date(new Date(reviewedAt).getTime() + milliseconds).toISOString()
}
