import { describe, expect, it } from 'vitest'
import type { StudyItem } from './dueCards'
import { isStudyItemDue, isStudyItemEligible } from './dueCards'

const now = '2026-06-22T12:00:00.000Z'

function studyItem(): StudyItem {
  return {
    deck: {
      id: 'deck-1',
      name: 'Dutch',
      description: 'Course',
      myLanguage: 'en',
      targetLanguage: 'nl',
      createdAt: now,
      updatedAt: now,
    },
    lesson: {
      id: 'lesson-1',
      deckId: 'deck-1',
      title: 'Lesson 1',
      description: 'Intro',
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    card: {
      id: 'card-1',
      deckId: 'deck-1',
      lessonId: 'lesson-1',
      cardType: 'myLanguageToDutch',
      frontText: 'house',
      backMyLanguage: 'house',
      backDutch: 'huis',
      article: 'het',
      notes: '',
      createdAt: now,
      updatedAt: now,
    },
    reviewState: {
      id: 'review-1',
      cardId: 'card-1',
      dueAt: now,
      intervalDays: 0,
      stability: 0,
      difficulty: 5,
      lapses: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  }
}

describe('isStudyItemDue', () => {
  it('accepts an active card due now', () => {
    expect(isStudyItemDue(studyItem(), now)).toBe(true)
  })

  it('rejects suspended cards and archived parents', () => {
    expect(
      isStudyItemDue(
        {
          ...studyItem(),
          card: { ...studyItem().card, suspendedAt: now },
        },
        now,
      ),
    ).toBe(false)
    expect(
      isStudyItemDue(
        {
          ...studyItem(),
          lesson: { ...studyItem().lesson, archivedAt: now },
        },
        now,
      ),
    ).toBe(false)
  })

  it('allows an eligible future card for Study All but not Study Due', () => {
    const future = {
      ...studyItem(),
      reviewState: {
        ...studyItem().reviewState,
        dueAt: '2026-06-23T12:00:00.000Z',
      },
    }

    expect(isStudyItemEligible(future)).toBe(true)
    expect(isStudyItemDue(future, now)).toBe(false)
  })
})
