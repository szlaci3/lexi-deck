import type { StudyItem } from './dueCards'

export type DailyStudyLimits = {
  newCards: number
  reviews: number
}

export type DailyStudyUsage = {
  newCards: number
  reviews: number
}

export type LimitedStudySelection = {
  items: StudyItem[]
  availableNewCards: number
  availableReviews: number
  hiddenNewCards: number
  hiddenReviews: number
}

export function applyDailyStudyLimits(
  items: StudyItem[],
  usage: DailyStudyUsage,
  limits: DailyStudyLimits,
): LimitedStudySelection {
  const remainingNewCards = Math.max(0, limits.newCards - usage.newCards)
  const remainingReviews = Math.max(0, limits.reviews - usage.reviews)
  const newCards = items.filter((item) => item.reviewState.reviewCount === 0)
  const reviews = items.filter((item) => item.reviewState.reviewCount > 0)
  const selectedReviews = reviews.slice(0, remainingReviews)
  const selectedNewCards = newCards.slice(0, remainingNewCards)

  return {
    items: [...selectedReviews, ...selectedNewCards],
    availableNewCards: selectedNewCards.length,
    availableReviews: selectedReviews.length,
    hiddenNewCards: Math.max(0, newCards.length - selectedNewCards.length),
    hiddenReviews: Math.max(0, reviews.length - selectedReviews.length),
  }
}
