import type {
  ReviewState,
  ScheduleReviewInput,
  ScheduledReviewResult,
  SrsRating,
} from './srsTypes'

const minutesPerDay = 24 * 60
const againIntervalDays = 10 / minutesPerDay
const targetRetention = 0.9

const firstReviewIntervals: Record<SrsRating, number> = {
  again: againIntervalDays,
  hard: 1,
  good: 3,
  easy: 7,
}

const minimumIntervals: Record<Exclude<SrsRating, 'again'>, number> = {
  hard: 1,
  good: 3,
  easy: 7,
}

const difficultyChanges: Record<SrsRating, number> = {
  again: 1,
  hard: 0.4,
  good: -0.2,
  easy: -0.6,
}

export function scheduleReview({
  reviewState,
  rating,
  reviewedAt,
}: ScheduleReviewInput): ScheduledReviewResult {
  const isFirstReview = reviewState.reviewCount === 0
  const currentDifficulty = clamp(reviewState.difficulty ?? 5, 1, 10)
  const nextDifficulty = clamp(
    currentDifficulty +
      difficultyChanges[rating] +
      (5 - currentDifficulty) * 0.05,
    1,
    10,
  )
  const nextStability = isFirstReview
    ? firstReviewIntervals[rating]
    : calculateNextStability(reviewState, rating, reviewedAt, nextDifficulty)
  const nextIntervalDays = isFirstReview
    ? firstReviewIntervals[rating]
    : stabilityToInterval(nextStability, rating)
  const nextDueAt = addInterval(reviewedAt, nextIntervalDays)

  return {
    reviewState: {
      ...reviewState,
      dueAt: nextDueAt,
      lastReviewedAt: reviewedAt,
      intervalDays: nextIntervalDays,
      stability: nextStability,
      difficulty: nextDifficulty,
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

export function calculateRetrievability(
  stability: number,
  elapsedDays: number,
): number {
  const safeStability = Math.max(againIntervalDays, stability)
  return Math.pow(1 + Math.max(0, elapsedDays) / (9 * safeStability), -1)
}

export function formatInterval(intervalDays: number): string {
  if (intervalDays < 1) {
    return `${Math.round(intervalDays * minutesPerDay)} min`
  }

  const days = Math.round(intervalDays)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

function calculateNextStability(
  reviewState: ReviewState,
  rating: SrsRating,
  reviewedAt: string,
  difficulty: number,
): number {
  const stability = Math.max(
    againIntervalDays,
    reviewState.stability ?? reviewState.intervalDays,
  )
  const elapsedDays = reviewState.lastReviewedAt
    ? differenceInDays(reviewState.lastReviewedAt, reviewedAt)
    : Math.max(0, reviewState.intervalDays)
  const retrievability = calculateRetrievability(stability, elapsedDays)

  if (rating === 'again') {
    return Math.max(
      againIntervalDays,
      stability *
        0.25 *
        (1 + (10 - difficulty) * 0.03) *
        getLapsePenalty(reviewState.lapses),
    )
  }

  const growth = getStabilityGrowth(rating, retrievability, difficulty)
  return stability * growth * getLapsePenalty(reviewState.lapses)
}

function getStabilityGrowth(
  rating: Exclude<SrsRating, 'again'>,
  retrievability: number,
  difficulty: number,
): number {
  const forgetting = 1 - retrievability
  if (rating === 'hard') {
    return 1.15 + forgetting * 0.5 + (10 - difficulty) * 0.015
  }
  if (rating === 'good') {
    return 1.5 + forgetting * 2 + (10 - difficulty) * 0.04
  }
  return 2.2 + forgetting * 3 + (10 - difficulty) * 0.06
}

function stabilityToInterval(
  stability: number,
  rating: SrsRating,
): number {
  if (rating === 'again') {
    return againIntervalDays
  }

  const retentionScale =
    Math.log(targetRetention) / Math.log(0.9)
  return Math.round(
    Math.max(minimumIntervals[rating], stability * retentionScale),
  )
}

function getLapsePenalty(lapses: number): number {
  return 1 / (1 + Math.min(Math.max(0, lapses), 10) * 0.03)
}

function differenceInDays(from: string, to: string): number {
  return Math.max(
    0,
    (new Date(to).getTime() - new Date(from).getTime()) /
      (24 * 60 * 60 * 1000),
  )
}

function addInterval(reviewedAt: string, intervalDays: number): string {
  const milliseconds = intervalDays * 24 * 60 * 60 * 1000
  return new Date(new Date(reviewedAt).getTime() + milliseconds).toISOString()
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
