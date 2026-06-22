import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  playDutchCardAudio,
  stopDutchAudio,
} from '../../domain/audio/audioService'
import { getDeckSummary } from '../../db/repositories/deckRepository'
import {
  listDueStudyItems,
  submitReview,
} from '../../db/repositories/reviewRepository'
import { getSettings } from '../../db/repositories/settingsRepository'
import type { DeckSummary } from '../../domain/decks/deckTypes'
import type { StudyItem } from '../../domain/srs/dueCards'
import { previewReviewIntervals } from '../../domain/srs/scheduleReview'
import type { SrsRating } from '../../domain/srs/srsTypes'
import type { AppSettings } from '../../domain/settings/settingsTypes'
import { RatingButtons } from './RatingButtons'
import { StudyCard } from './StudyCard'
import styles from './StudySessionScreen.module.css'

type SessionCounts = Record<SrsRating, number>

const emptyCounts: SessionCounts = {
  again: 0,
  hard: 0,
  good: 0,
  easy: 0,
}

export function StudySessionScreen() {
  const { deckId } = useParams()
  const [items, setItems] = useState<StudyItem[]>([])
  const [deckSummary, setDeckSummary] = useState<DeckSummary>()
  const [settings, setSettings] = useState<AppSettings>()
  const [isRevealed, setIsRevealed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [counts, setCounts] = useState<SessionCounts>(emptyCounts)
  const [cardShownAt, setCardShownAt] = useState(() => Date.now())

  useEffect(() => {
    let isActive = true
    const now = new Date().toISOString()

    Promise.all([
      listDueStudyItems({ now, deckId }),
      getSettings(),
      deckId ? getDeckSummary(deckId) : Promise.resolve(undefined),
    ])
      .then(([dueItems, nextSettings, nextDeckSummary]) => {
        if (!isActive) {
          return
        }

        if (deckId && !nextDeckSummary) {
          setError('This deck was not found or has been archived.')
          return
        }

        setItems(dueItems)
        setSettings(nextSettings)
        setDeckSummary(nextDeckSummary)
        setCardShownAt(Date.now())
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'The study session could not be loaded.',
          )
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
      stopDutchAudio()
    }
  }, [deckId])

  const currentItem = items[0]
  const previewTime = new Date().toISOString()
  const previews = useMemo(
    () =>
      currentItem
        ? previewReviewIntervals(currentItem.reviewState, previewTime)
        : undefined,
    [currentItem, previewTime],
  )

  async function playAudio() {
    if (!currentItem || !settings) {
      return
    }

    setIsPlayingAudio(true)
    setAudioError('')

    try {
      await playDutchCardAudio(currentItem.card, settings)
    } catch (playError: unknown) {
      setAudioError(
        playError instanceof Error
          ? playError.message
          : 'Dutch audio could not play.',
      )
    } finally {
      setIsPlayingAudio(false)
    }
  }

  function revealAnswer() {
    setIsRevealed(true)
    if (settings?.autoPlayAudio) {
      void playAudio()
    }
  }

  async function rateCard(rating: SrsRating) {
    if (!currentItem) {
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await submitReview({
        cardId: currentItem.card.id,
        rating,
        reviewedAt: new Date().toISOString(),
        responseTimeMs: Math.max(0, Date.now() - cardShownAt),
      })
      stopDutchAudio()
      setItems((currentItems) => currentItems.slice(1))
      setCounts((currentCounts) => ({
        ...currentCounts,
        [rating]: currentCounts[rating] + 1,
      }))
      setReviewedCount((count) => count + 1)
      setIsRevealed(false)
      setAudioError('')
      setCardShownAt(Date.now())
    } catch (reviewError: unknown) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'The review could not be saved.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading due cards…</p>
  }

  if (error && !currentItem) {
    return (
      <section className={styles.errorState} role="alert">
        <h1>Study is unavailable.</h1>
        <p>{error}</p>
        <Link to={deckId ? `/decks/${deckId}` : '/'}>Go back</Link>
      </section>
    )
  }

  if (!currentItem && reviewedCount > 0) {
    return (
      <section className={styles.summary}>
        <p className={styles.eyebrow}>Session complete</p>
        <h1>Nicely done.</h1>
        <p>You reviewed {reviewedCount} cards.</p>
        <div className={styles.summaryGrid}>
          {(['again', 'hard', 'good', 'easy'] as SrsRating[]).map((rating) => (
            <article key={rating}>
              <span>{rating}</span>
              <strong>{counts[rating]}</strong>
            </article>
          ))}
        </div>
        <Link to={deckId ? `/decks/${deckId}` : '/'}>Finish session</Link>
      </section>
    )
  }

  if (!currentItem) {
    return (
      <section className={styles.emptyState}>
        <p className={styles.eyebrow}>All caught up</p>
        <h1>No cards are due.</h1>
        <p>
          {deckSummary
            ? `${deckSummary.deck.name} has nothing scheduled right now.`
            : 'Your active decks have nothing scheduled right now.'}
        </p>
        <Link to={deckId ? `/decks/${deckId}` : '/'}>Go back</Link>
      </section>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {deckSummary ? deckSummary.deck.name : 'All decks'}
          </p>
          <h1>Study session</h1>
        </div>
        <span>{items.length} remaining</span>
      </header>

      <StudyCard
        item={currentItem}
        isRevealed={isRevealed}
        isPlayingAudio={isPlayingAudio}
        audioError={audioError}
        onReveal={revealAnswer}
        onPlayAudio={() => void playAudio()}
      />

      {isRevealed && previews ? (
        <RatingButtons
          previews={previews}
          disabled={isSubmitting}
          onRate={(rating) => void rateCard(rating)}
        />
      ) : null}

      {error ? (
        <p className={styles.reviewError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
