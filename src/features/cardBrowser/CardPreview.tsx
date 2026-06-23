import { useEffect, useState } from 'react'
import {
  playDutchCardAudio,
  stopDutchAudio,
} from '../../domain/audio/audioService'
import { getDutchDisplayText } from '../../domain/cards/cardDisplay'
import { getCardPresentation } from '../../domain/cards/cardPresentation'
import type { Card } from '../../domain/cards/cardTypes'
import type { Deck } from '../../domain/decks/deckTypes'
import { myLanguageLabels } from '../../domain/decks/deckTypes'
import type { SourceImage } from '../../domain/media/mediaTypes'
import type { AppSettings } from '../../domain/settings/settingsTypes'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import styles from './CardPreview.module.css'

type CardPreviewProps = {
  card: Card
  deck: Deck
  settings: AppSettings
  image?: SourceImage
  onClose: () => void
}

export function CardPreview({
  card,
  deck,
  settings,
  image,
  onClose,
}: CardPreviewProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState('')
  const presentation = getCardPresentation(card)
  const myLanguageLabel = myLanguageLabels[deck.myLanguage]

  useEffect(() => stopDutchAudio, [])

  async function playAudio() {
    setIsPlaying(true)
    setAudioError('')

    try {
      await playDutchCardAudio(card, settings)
    } catch (error: unknown) {
      setAudioError(
        error instanceof Error ? error.message : 'Dutch audio could not play.',
      )
    } finally {
      setIsPlaying(false)
    }
  }

  function revealAnswer() {
    setIsRevealed(true)
    if (settings.autoPlayAudio && presentation.dutchOnAnswer) {
      void playAudio()
    }
  }

  return (
    <section
      className={styles.preview}
      role="region"
      aria-labelledby="card-preview-heading"
    >
      <div className={styles.heading}>
        <div>
          <p>Card preview</p>
          <h2 id="card-preview-heading">Practice this card</h2>
        </div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className={styles.studyCard}>
        <span>
          {formatLanguageLabel(presentation.promptLanguage, myLanguageLabel)}
        </span>
        {presentation.promptKind === 'image' ? (
          image ? (
            <PreviewImage image={image} />
          ) : (
            <strong>Image unavailable</strong>
          )
        ) : (
          <strong>{presentation.promptText}</strong>
        )}
        {presentation.dutchOnPrompt ? (
          <button
            className={styles.audioButton}
            type="button"
            onClick={() => void playAudio()}
            disabled={isPlaying}
            aria-label={`Play Dutch pronunciation for ${getDutchDisplayText(card)}`}
          >
            {isPlaying ? 'Playing…' : 'Play Dutch audio'}
          </button>
        ) : null}
        {audioError && presentation.dutchOnPrompt ? (
          <p className={styles.audioError} role="alert">
            {audioError}
          </p>
        ) : null}

        {!isRevealed ? (
          <button
            className={styles.revealButton}
            type="button"
            onClick={revealAnswer}
          >
            Reveal answer
          </button>
        ) : (
          <div className={styles.answer}>
            <span>
              {formatLanguageLabel(
                presentation.answerLanguage,
                myLanguageLabel,
              )}
            </span>
            {presentation.answerKind === 'image' ? (
              image ? (
                <PreviewImage image={image} />
              ) : (
                <strong>Image unavailable</strong>
              )
            ) : (
              <strong>{presentation.answerText}</strong>
            )}
            {presentation.secondaryAnswerText ? (
              <p>{presentation.secondaryAnswerText}</p>
            ) : null}
            {card.notes ? <p>{card.notes}</p> : null}
            {presentation.dutchOnAnswer ? (
              <button
                className={styles.audioButton}
                type="button"
                onClick={() => void playAudio()}
                disabled={isPlaying}
                aria-label={`Play Dutch pronunciation for ${getDutchDisplayText(card)}`}
              >
                {isPlaying ? 'Playing…' : 'Play Dutch audio'}
              </button>
            ) : null}
            {audioError && presentation.dutchOnAnswer ? (
              <p className={styles.audioError} role="alert">
                {audioError}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}

function PreviewImage({ image }: { image: SourceImage }) {
  const url = useBlobUrl(image.blob)
  return (
    <img
      className={styles.previewImage}
      src={url}
      alt={`Card image from ${image.fileName}`}
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
