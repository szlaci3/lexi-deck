import { getDutchDisplayText } from '../../domain/cards/cardDisplay'
import { myLanguageLabels } from '../../domain/decks/deckTypes'
import type { StudyItem } from '../../domain/srs/dueCards'
import styles from './StudyCard.module.css'

type StudyCardProps = {
  item: StudyItem
  isRevealed: boolean
  isPlayingAudio: boolean
  audioError: string
  onReveal: () => void
  onPlayAudio: () => void
}

export function StudyCard({
  item,
  isRevealed,
  isPlayingAudio,
  audioError,
  onReveal,
  onPlayAudio,
}: StudyCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.context}>
        <span>{item.deck.name}</span>
        <span>{item.lesson.title}</span>
      </div>

      <div className={styles.prompt}>
        <span>{myLanguageLabels[item.deck.myLanguage]}</span>
        <strong>{item.card.frontText}</strong>
      </div>

      {!isRevealed ? (
        <button className={styles.revealButton} type="button" onClick={onReveal}>
          Reveal answer
        </button>
      ) : (
        <div className={styles.answer}>
          <span>Dutch</span>
          <strong>{getDutchDisplayText(item.card)}</strong>
          {item.card.notes ? <p>{item.card.notes}</p> : null}
          <button
            type="button"
            onClick={onPlayAudio}
            disabled={isPlayingAudio}
            aria-label={`Play Dutch pronunciation for ${getDutchDisplayText(
              item.card,
            )}`}
          >
            {isPlayingAudio ? 'Playing…' : 'Play Dutch audio'}
          </button>
          {audioError ? (
            <p className={styles.audioError} role="alert">
              {audioError}
            </p>
          ) : null}
        </div>
      )}
    </article>
  )
}
