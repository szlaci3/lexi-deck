import { describe, expect, it } from 'vitest'
import type { ReviewState, SrsRating } from './srsTypes'
import {
  formatInterval,
  previewReviewIntervals,
  scheduleReview,
} from './scheduleReview'

const reviewedAt = '2026-06-22T12:00:00.000Z'

function reviewState(overrides: Partial<ReviewState> = {}): ReviewState {
  return {
    id: 'review-1',
    cardId: 'card-1',
    dueAt: reviewedAt,
    intervalDays: 0,
    stability: 0,
    difficulty: 5,
    lapses: 0,
    reviewCount: 0,
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
    ...overrides,
  }
}

describe('scheduleReview', () => {
  it.each([
    ['again', '10 min', '2026-06-22T12:10:00.000Z'],
    ['hard', '1 day', '2026-06-23T12:00:00.000Z'],
    ['good', '3 days', '2026-06-25T12:00:00.000Z'],
    ['easy', '7 days', '2026-06-29T12:00:00.000Z'],
  ] as const)(
    'uses the locked first-review interval for %s',
    (rating, label, dueAt) => {
      const result = scheduleReview({
        reviewState: reviewState(),
        rating,
        reviewedAt,
      })

      expect(result.intervalLabel).toBe(label)
      expect(result.reviewState.dueAt).toBe(dueAt)
      expect(result.reviewState.reviewCount).toBe(1)
    },
  )

  it.each([
    ['again', 10 / 1440, 3],
    ['hard', 12, 2],
    ['good', 22, 2],
    ['easy', 35, 2],
  ] as const)(
    'uses the later-review model for %s',
    (rating, intervalDays, lapses) => {
      const result = scheduleReview({
        reviewState: reviewState({
          intervalDays: 10,
          reviewCount: 4,
          lapses: 2,
        }),
        rating,
        reviewedAt,
      })

      expect(result.reviewState.intervalDays).toBeCloseTo(intervalDays)
      expect(result.reviewState.lapses).toBe(lapses)
      expect(result.reviewState.reviewCount).toBe(5)
    },
  )

  it('produces all four interval previews from the scheduler', () => {
    const previews = previewReviewIntervals(reviewState(), reviewedAt)

    expect(
      (Object.keys(previews) as SrsRating[]).map(
        (rating) => previews[rating].intervalLabel,
      ),
    ).toEqual(['10 min', '1 day', '3 days', '7 days'])
  })

  it('formats singular and plural day intervals', () => {
    expect(formatInterval(1)).toBe('1 day')
    expect(formatInterval(3)).toBe('3 days')
  })
})
