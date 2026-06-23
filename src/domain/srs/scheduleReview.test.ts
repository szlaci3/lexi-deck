import { describe, expect, it } from 'vitest'
import type { ReviewState, SrsRating } from './srsTypes'
import {
  calculateRetrievability,
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
    'preserves the first-review interval for %s',
    (rating, label, dueAt) => {
      const result = scheduleReview({
        reviewState: reviewState(),
        rating,
        reviewedAt,
      })

      expect(result.intervalLabel).toBe(label)
      expect(result.reviewState.dueAt).toBe(dueAt)
      expect(result.reviewState.stability).toBe(result.reviewState.intervalDays)
    },
  )

  it('uses elapsed time, stability, and difficulty for later reviews', () => {
    const onTime = scheduleReview({
      reviewState: reviewState({
        intervalDays: 10,
        stability: 10,
        difficulty: 5,
        reviewCount: 4,
        lastReviewedAt: '2026-06-12T12:00:00.000Z',
      }),
      rating: 'good',
      reviewedAt,
    })
    const overdue = scheduleReview({
      reviewState: reviewState({
        intervalDays: 10,
        stability: 10,
        difficulty: 5,
        reviewCount: 4,
        lastReviewedAt: '2026-06-02T12:00:00.000Z',
      }),
      rating: 'good',
      reviewedAt,
    })

    expect(overdue.reviewState.intervalDays).toBeGreaterThan(
      onTime.reviewState.intervalDays,
    )
    expect(onTime.reviewState.difficulty).toBeLessThan(5)
  })

  it('reduces future stability when a card has accumulated lapses', () => {
    const stable = reviewState({
      intervalDays: 10,
      stability: 10,
      reviewCount: 4,
      lapses: 0,
      lastReviewedAt: '2026-06-12T12:00:00.000Z',
    })
    const withoutLapses = scheduleReview({
      reviewState: stable,
      rating: 'good',
      reviewedAt,
    })
    const withLapses = scheduleReview({
      reviewState: { ...stable, lapses: 5 },
      rating: 'good',
      reviewedAt,
    })

    expect(withLapses.reviewState.stability).toBeLessThan(
      withoutLapses.reviewState.stability ?? 0,
    )
  })

  it('resets Again to ten minutes and increases lapses and difficulty', () => {
    const result = scheduleReview({
      reviewState: reviewState({
        intervalDays: 20,
        stability: 20,
        difficulty: 6,
        reviewCount: 4,
        lapses: 2,
        lastReviewedAt: '2026-06-02T12:00:00.000Z',
      }),
      rating: 'again',
      reviewedAt,
    })

    expect(result.intervalLabel).toBe('10 min')
    expect(result.reviewState.lapses).toBe(3)
    expect(result.reviewState.difficulty).toBeGreaterThan(6)
    expect(result.reviewState.stability).toBeLessThan(20)
  })

  it('estimates 90% retrievability after one stability interval', () => {
    expect(calculateRetrievability(10, 10)).toBeCloseTo(0.9)
  })

  it('produces all four dynamic interval previews', () => {
    const previews = previewReviewIntervals(
      reviewState({
        intervalDays: 10,
        stability: 10,
        reviewCount: 2,
        lastReviewedAt: '2026-06-12T12:00:00.000Z',
      }),
      reviewedAt,
    )
    const intervals = (Object.keys(previews) as SrsRating[]).map(
      (rating) => previews[rating].reviewState.intervalDays,
    )

    expect(intervals[0]).toBeCloseTo(10 / 1440)
    expect(intervals[1]).toBeLessThan(intervals[2] ?? 0)
    expect(intervals[2]).toBeLessThan(intervals[3] ?? 0)
  })

  it('formats singular and plural day intervals', () => {
    expect(formatInterval(1)).toBe('1 day')
    expect(formatInterval(3)).toBe('3 days')
  })
})
