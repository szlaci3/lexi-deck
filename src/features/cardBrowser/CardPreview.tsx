import { useEffect, useState } from 'react'
import {
  playDutchCardAudio,
  stopDutchAudio,
} from '../../domain/audio/audioService'
import { getDutchDisplayText } from '../../domain/cards/cardDisplay'
import type { Card } from '../../domain/cards/cardTypes'
import type { Deck } from '../../domain/decks/deckTypes'
import { myLanguageLabels } from '../../domain/decks/deckTypes'
import type { AppSettings } from '../../domain/settings/settingsTypes'
import styles from './CardPreview.module.css'

type CardPreviewProps = {
  card: Card
  deck: Deck
  settings: AppSettings
  onClose: () => void
}

export function CardPreview({
  card,
  deck,
  settings,
  onClose,
}: CardPreviewProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState('')

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
    if (settings.autoPlayAudio) {
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
        <span>{myLanguageLabels[deck.myLanguage]}</span>
        <strong>{card.frontText}</strong>

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
            <span>Dutch</span>
            <strong>{getDutchDisplayText(card)}</strong>
            {card.notes ? <p>{card.notes}</p> : null}
            <button
              className={styles.audioButton}
              type="button"
              onClick={() => void playAudio()}
              disabled={isPlaying}
              aria-label={`Play Dutch pronunciation for ${getDutchDisplayText(card)}`}
            >
              {isPlaying ? 'Playing…' : 'Play Dutch audio'}
            </button>
            {audioError ? (
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
