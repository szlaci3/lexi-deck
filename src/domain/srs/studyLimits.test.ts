import { describe, expect, it } from 'vitest'
import type { StudyItem } from './dueCards'
import { applyDailyStudyLimits } from './studyLimits'

function item(id: string, reviewCount: number): StudyItem {
  const timestamp = '2026-06-23T08:00:00.000Z'
  return {
    deck: {
      id: 'deck-1',
      name: 'Deck',
      description: '',
      myLanguage: 'en',
      targetLanguage: 'nl',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    lesson: {
      id: 'lesson-1',
      deckId: 'deck-1',
      title: 'Lesson',
      description: '',
      order: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    card: {
      id,
      deckId: 'deck-1',
      lessonId: 'lesson-1',
      cardType: 'myLanguageToDutch',
      frontText: id,
      backDutch: id,
      backMyLanguage: id,
      article: 'none',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    reviewState: {
      id: `state-${id}`,
      cardId: id,
      dueAt: timestamp,
      intervalDays: reviewCount === 0 ? 0 : 3,
      stability: reviewCount === 0 ? 0 : 3,
      difficulty: 5,
      lapses: 0,
      reviewCount,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  }
}

describe('applyDailyStudyLimits', () => {
  it('selects reviews before new cards and subtracts global usage', () => {
    const result = applyDailyStudyLimits(
      [item('new-1', 0), item('review-1', 2), item('review-2', 1)],
      { newCards: 19, reviews: 199 },
      { newCards: 20, reviews: 200 },
    )

    expect(result.items.map((studyItem) => studyItem.card.id)).toEqual([
      'review-1',
      'new-1',
    ])
    expect(result.hiddenReviews).toBe(1)
  })

  it('respects a zero remaining allowance for overdue reviews', () => {
    const result = applyDailyStudyLimits(
      [item('review-1', 5)],
      { newCards: 0, reviews: 200 },
      { newCards: 20, reviews: 200 },
    )

    expect(result.items).toHaveLength(0)
    expect(result.hiddenReviews).toBe(1)
  })
})
