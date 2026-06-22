export type SrsRating = 'again' | 'hard' | 'good' | 'easy'

export const srsRatingLabels: Record<SrsRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
}

export type ReviewState = {
  id: string
  cardId: string
  dueAt: string
  lastReviewedAt?: string
  intervalDays: number
  stability?: number
  difficulty?: number
  lapses: number
  reviewCount: number
  createdAt: string
  updatedAt: string
}

export type ReviewLog = {
  id: string
  cardId: string
  reviewedAt: string
  rating: SrsRating
  previousDueAt: string
  nextDueAt: string
  previousIntervalDays: number
  nextIntervalDays: number
  responseTimeMs?: number
}

export type ScheduleReviewInput = {
  reviewState: ReviewState
  rating: SrsRating
  reviewedAt: string
}

export type ScheduledReviewResult = {
  reviewState: ReviewState
  intervalLabel: string
}
