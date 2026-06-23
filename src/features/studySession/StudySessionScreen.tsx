import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  playDutchCardAudio,
  stopDutchAudio,
} from '../../domain/audio/audioService'
import { getCardPresentation } from '../../domain/cards/cardPresentation'
import { getDeckSummary } from '../../db/repositories/deckRepository'
import { getLessonById } from '../../db/repositories/lessonRepository'
import {
  listEligibleStudyItems,
  listLimitedStudyItems,
  submitReview,
} from '../../db/repositories/reviewRepository'
import { getSettings } from '../../db/repositories/settingsRepository'
import type { DeckSummary } from '../../domain/decks/deckTypes'
import type { Lesson } from '../../domain/lessons/lessonTypes'
import type { AppSettings } from '../../domain/settings/settingsTypes'
import type { StudyItem } from '../../domain/srs/dueCards'
import { previewReviewIntervals } from '../../domain/srs/scheduleReview'
import type { StudyRating } from '../../domain/srs/srsTypes'
import type { LimitedStudySelection } from '../../domain/srs/studyLimits'
import { RatingButtons } from './RatingButtons'
import { StudyCard } from './StudyCard'
import styles from './StudySessionScreen.module.css'

type SessionCounts = Record<StudyRating, number>

type StudySessionScreenProps = {
  mode?: 'all' | 'due'
}

type SessionSelection = Pick<
  LimitedStudySelection,
  'items' | 'hiddenNewCards' | 'hiddenReviews'
>

const emptyCounts: SessionCounts = {
  hard: 0,
  easy: 0,
}

const emptySelection: Pick<
  LimitedStudySelection,
  'hiddenNewCards' | 'hiddenReviews'
> = {
  hiddenNewCards: 0,
  hiddenReviews: 0,
}

export function StudySessionScreen({
  mode = 'due',
}: StudySessionScreenProps) {
  const { deckId, lessonId } = useParams()
  const [items, setItems] = useState<StudyItem[]>([])
  const [deckSummary, setDeckSummary] = useState<DeckSummary>()
  const [lesson, setLesson] = useState<Lesson>()
  const [settings, setSettings] = useState<AppSettings>()
  const [limitedCounts, setLimitedCounts] = useState(emptySelection)
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
      getSettings(),
      lessonId ? getLessonById(lessonId) : Promise.resolve(undefined),
    ])
      .then(async ([nextSettings, nextLesson]) => {
        if (lessonId && (!nextLesson || nextLesson.archivedAt)) {
          throw new Error('This lesson was not found or has been archived.')
        }

        const scopedDeckId = nextLesson?.deckId ?? deckId
        const nextDeckSummary = scopedDeckId
          ? await getDeckSummary(scopedDeckId)
          : undefined
        if (scopedDeckId && !nextDeckSummary) {
          throw new Error('This deck was not found or has been archived.')
        }

        let selection: SessionSelection
        if (mode === 'all' && lessonId) {
          selection = {
            items: await listEligibleStudyItems({
              deckId: scopedDeckId,
              lessonId,
            }),
            hiddenNewCards: 0,
            hiddenReviews: 0,
          }
        } else {
          selection = await listLimitedStudyItems({
            now,
            deckId: scopedDeckId,
            lessonId,
            limits: {
              newCards: nextSettings.dailyNewCardLimit,
              reviews: nextSettings.dailyReviewLimit,
            },
          })
        }

        return {
          nextSettings,
          nextDeckSummary,
          nextLesson,
          selection,
        }
      })
      .then(({ nextSettings, nextDeckSummary, nextLesson, selection }) => {
        if (!isActive) return

        setItems(selection.items)
        setLimitedCounts({
          hiddenNewCards: selection.hiddenNewCards,
          hiddenReviews: selection.hiddenReviews,
        })
        setSettings(nextSettings)
        setDeckSummary(nextDeckSummary)
        setLesson(nextLesson)
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
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
      stopDutchAudio()
    }
  }, [deckId, lessonId, mode])

  const currentItem = items[0]
  const previewTime = new Date().toISOString()
  const previews = useMemo(
    () =>
      currentItem
        ? previewReviewIntervals(currentItem.reviewState, previewTime)
        : undefined,
    [currentItem, previewTime],
  )
  const returnPath = lesson
    ? `/decks/${lesson.deckId}/lessons/${lesson.id}`
    : deckId
      ? `/decks/${deckId}`
      : '/'

  async function playAudio() {
    if (!currentItem || !settings) return

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
    if (
      settings?.autoPlayAudio &&
      currentItem &&
      getCardPresentation(currentItem.card).dutchOnAnswer
    ) {
      void playAudio()
    }
  }

  async function rateCard(rating: StudyRating) {
    if (!currentItem) return

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
    return (
      <p className={styles.status}>
        Loading {mode === 'all' ? 'lesson cards' : 'due cards'}…
      </p>
    )
  }

  if (error && !currentItem) {
    return (
      <section className={styles.errorState} role="alert">
        <h1>Study is unavailable.</h1>
        <p>{error}</p>
        <Link to={returnPath}>Go back</Link>
      </section>
    )
  }

  if (!currentItem && reviewedCount > 0) {
    return (
      <section className={styles.summary}>
        <p className={styles.eyebrow}>Session complete</p>
        <h1>Nicely done.</h1>
        <p>You reviewed {reviewedCount} cards.</p>
        {limitedCounts.hiddenNewCards + limitedCounts.hiddenReviews > 0 ? (
          <p>
            Your daily limit is reached. {limitedCounts.hiddenReviews} reviews
            and {limitedCounts.hiddenNewCards} new cards remain due.
          </p>
        ) : null}
        <div className={styles.summaryGrid}>
          {(['hard', 'easy'] as StudyRating[]).map((rating) => (
            <article key={rating}>
              <span>{rating}</span>
              <strong>{counts[rating]}</strong>
            </article>
          ))}
        </div>
        <Link to={returnPath}>Finish session</Link>
      </section>
    )
  }

  if (!currentItem) {
    const isLimited =
      limitedCounts.hiddenNewCards + limitedCounts.hiddenReviews > 0
    return (
      <section className={styles.emptyState}>
        <p className={styles.eyebrow}>
          {isLimited ? 'Daily limit reached' : 'All caught up'}
        </p>
        <h1>
          {isLimited
            ? 'Study complete for today.'
            : mode === 'all'
              ? 'No cards are available.'
              : 'No cards are due.'}
        </h1>
        <p>
          {isLimited
            ? `${limitedCounts.hiddenReviews} reviews and ${limitedCounts.hiddenNewCards} new cards remain due. Change the global limits in Settings if needed.`
            : mode === 'all' && lesson
              ? `${lesson.title} has no active, unsuspended cards to study.`
              : deckSummary
                ? `${deckSummary.deck.name} has nothing scheduled right now.`
                : 'Your active decks have nothing scheduled right now.'}
        </p>
        <Link to={returnPath}>Go back</Link>
      </section>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {lesson
              ? `${lesson.title} · ${mode === 'all' ? 'Study all' : 'Study due'}`
              : deckSummary
                ? deckSummary.deck.name
                : 'All decks'}
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
