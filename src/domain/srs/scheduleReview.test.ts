import { describe, expect, it } from 'vitest'
import type { ReviewState } from './srsTypes'
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
  it('schedules Hard for exactly ten minutes', () => {
    const result = scheduleReview({
      reviewState: reviewState({ reviewCount: 8, intervalDays: 30 }),
      rating: 'hard',
      reviewedAt,
    })

    expect(result.intervalLabel).toBe('10分钟')
    expect(result.reviewState.dueAt).toBe('2026-06-22T12:10:00.000Z')
    expect(result.reviewState.intervalDays).toBeCloseTo(10 / 1440)
    expect(result.reviewState.lapses).toBe(1)
  })

  it('schedules Easy for exactly one day', () => {
    const result = scheduleReview({
      reviewState: reviewState({ reviewCount: 8, intervalDays: 30 }),
      rating: 'easy',
      reviewedAt,
    })

    expect(result.intervalLabel).toBe('1 天')
    expect(result.reviewState.dueAt).toBe('2026-06-23T12:00:00.000Z')
    expect(result.reviewState.intervalDays).toBe(1)
    expect(result.reviewState.lapses).toBe(0)
  })

  it('produces only Hard and Easy previews', () => {
    const previews = previewReviewIntervals(reviewState(), reviewedAt)

    expect(Object.keys(previews)).toEqual(['hard', 'easy'])
    expect(previews.hard.intervalLabel).toBe('10分钟')
    expect(previews.easy.intervalLabel).toBe('1 天')
  })

  it('formats singular and plural day intervals', () => {
    expect(formatInterval(1)).toBe('1 天')
    expect(formatInterval(3)).toBe('3 天')
  })
})
