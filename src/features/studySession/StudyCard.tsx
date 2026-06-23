import { getDutchDisplayText } from '../../domain/cards/cardDisplay'
import { getCardPresentation } from '../../domain/cards/cardPresentation'
import { myLanguageLabels } from '../../domain/decks/deckTypes'
import type { SourceImage } from '../../domain/media/mediaTypes'
import type { StudyItem } from '../../domain/srs/dueCards'
import { useBlobUrl } from '../../hooks/useBlobUrl'
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
  const presentation = getCardPresentation(item.card)
  const myLanguageLabel = myLanguageLabels[item.deck.myLanguage]

  return (
    <article className={styles.card}>
      <div className={styles.context}>
        <span>{item.deck.name}</span>
        <span>{item.lesson.title}</span>
      </div>

      <div className={styles.prompt}>
        <span>
          {formatLanguageLabel(presentation.promptLanguage, myLanguageLabel)}
        </span>
        {presentation.promptKind === 'image' ? (
          item.image ? (
            <StudyImage image={item.image} />
          ) : (
            <strong>Image unavailable</strong>
          )
        ) : (
          <strong>{presentation.promptText}</strong>
        )}
        {presentation.dutchOnPrompt ? (
          <button
            className={styles.promptAudioButton}
            type="button"
            onClick={onPlayAudio}
            disabled={isPlayingAudio}
            aria-label={`Play Dutch pronunciation for ${getDutchDisplayText(
              item.card,
            )}`}
          >
            {isPlayingAudio ? 'Playing…' : 'Play Dutch audio'}
          </button>
        ) : null}
        {audioError && presentation.dutchOnPrompt ? (
          <p className={styles.audioError} role="alert">
            {audioError}
          </p>
        ) : null}
      </div>

      {!isRevealed ? (
        <button className={styles.revealButton} type="button" onClick={onReveal}>
          Reveal answer
        </button>
      ) : (
        <div className={styles.answer}>
          <span>
            {formatLanguageLabel(presentation.answerLanguage, myLanguageLabel)}
          </span>
          {presentation.answerKind === 'image' ? (
            item.image ? (
              <StudyImage image={item.image} />
            ) : (
              <strong>Image unavailable</strong>
            )
          ) : (
            <strong>{presentation.answerText}</strong>
          )}
          {presentation.secondaryAnswerText ? (
            <p>{presentation.secondaryAnswerText}</p>
          ) : null}
          {item.card.notes ? <p>{item.card.notes}</p> : null}
          {presentation.dutchOnAnswer ? (
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
          ) : null}
          {audioError && presentation.dutchOnAnswer ? (
            <p className={styles.audioError} role="alert">
              {audioError}
            </p>
          ) : null}
        </div>
      )}
    </article>
  )
}

function StudyImage({ image }: { image: SourceImage }) {
  const url = useBlobUrl(image.blob)
  return (
    <img
      className={styles.studyImage}
      src={url}
      alt={`Study image from ${image.fileName}`}
    />
  )
}

function formatLanguageLabel(
  language: 'myLanguage' | 'dutch' | 'image',
  myLanguageLabel: string,
): string {
  if (language === 'dutch') return 'Dutch'
  if (language === 'image') return 'Image'
  return myLanguageLabel
}
