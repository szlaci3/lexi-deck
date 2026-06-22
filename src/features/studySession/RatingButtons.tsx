import {
  srsRatingLabels,
  type ScheduledReviewResult,
  type SrsRating,
} from '../../domain/srs/srsTypes'
import styles from './RatingButtons.module.css'

type RatingButtonsProps = {
  previews: Record<SrsRating, ScheduledReviewResult>
  disabled: boolean
  onRate: (rating: SrsRating) => void
}

const ratings: SrsRating[] = ['again', 'hard', 'good', 'easy']

export function RatingButtons({
  previews,
  disabled,
  onRate,
}: RatingButtonsProps) {
  return (
    <div className={styles.grid} aria-label="Rate your answer">
      {ratings.map((rating) => (
        <button
          key={rating}
          className={styles[rating]}
          type="button"
          disabled={disabled}
          onClick={() => onRate(rating)}
        >
          <strong>{srsRatingLabels[rating]}</strong>
          <span>{previews[rating].intervalLabel}</span>
        </button>
      ))}
    </div>
  )
}
