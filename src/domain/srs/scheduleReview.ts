import type {
  ReviewState,
  ScheduleReviewInput,
  ScheduledReviewResult,
  StudyRating,
} from './srsTypes'

const minutesPerDay = 24 * 60
const hardIntervalDays = 10 / minutesPerDay

const reviewIntervals: Record<StudyRating, number> = {
  hard: hardIntervalDays,
  easy: 1,
}

export function scheduleReview({
  reviewState,
  rating,
  reviewedAt,
}: ScheduleReviewInput): ScheduledReviewResult {
  const nextIntervalDays = reviewIntervals[rating]
  const nextDifficulty =
    rating === 'hard'
      ? Math.min(10, (reviewState.difficulty ?? 5) + 1)
      : Math.max(1, (reviewState.difficulty ?? 5) - 0.2)

  return {
    reviewState: {
      ...reviewState,
      dueAt: addInterval(reviewedAt, nextIntervalDays),
      lastReviewedAt: reviewedAt,
      intervalDays: nextIntervalDays,
      stability: nextIntervalDays,
      difficulty: nextDifficulty,
      lapses: reviewState.lapses + (rating === 'hard' ? 1 : 0),
      reviewCount: reviewState.reviewCount + 1,
      updatedAt: reviewedAt,
    },
    intervalLabel: formatInterval(nextIntervalDays),
  }
}

export function previewReviewIntervals(
  reviewState: ReviewState,
  reviewedAt: string,
): Record<StudyRating, ScheduledReviewResult> {
  return {
    hard: scheduleReview({ reviewState, rating: 'hard', reviewedAt }),
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

function addInterval(reviewedAt: string, intervalDays: number): string {
  const milliseconds = intervalDays * 24 * 60 * 60 * 1000
  return new Date(new Date(reviewedAt).getTime() + milliseconds).toISOString()
}
