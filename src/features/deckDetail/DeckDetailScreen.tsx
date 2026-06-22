import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  archiveDeck,
  getDeckSummary,
  updateDeck,
} from '../../db/repositories/deckRepository'
import {
  myLanguageLabels,
  targetLanguageLabels,
  type CreateDeckInput,
  type DeckSummary,
} from '../../domain/decks/deckTypes'
import { DeckForm } from '../dashboard/DeckForm'
import styles from './DeckDetailScreen.module.css'

export function DeckDetailScreen() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DeckSummary>()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDeck = useCallback(async () => {
    if (!deckId) {
      setError('This deck address is invalid.')
      setIsLoading(false)
      return
    }

    setError('')

    try {
      const nextSummary = await getDeckSummary(deckId)
      if (!nextSummary) {
        setError('This deck was not found or has been archived.')
      }
      setSummary(nextSummary)
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'The deck could not be loaded.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [deckId])

  useEffect(() => {
    let isActive = true

    if (!deckId) {
      return
    }

    getDeckSummary(deckId)
      .then((nextSummary) => {
        if (!isActive) {
          return
        }

        if (!nextSummary) {
          setError('This deck was not found or has been archived.')
        }
        setSummary(nextSummary)
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'The deck could not be loaded.',
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
    }
  }, [deckId])

  async function saveDeck(input: CreateDeckInput) {
    if (!deckId) {
      return
    }

    await updateDeck(deckId, input)
    setIsEditing(false)
    await loadDeck()
  }

  async function confirmArchive() {
    if (!summary) {
      return
    }

    const shouldArchive = window.confirm(
      `Archive “${summary.deck.name}”? It will disappear from normal deck lists.`,
    )

    if (!shouldArchive) {
      return
    }

    try {
      await archiveDeck(summary.deck.id)
      navigate('/')
    } catch (archiveError: unknown) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : 'The deck could not be archived.',
      )
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading deck…</p>
  }

  if (error || !summary) {
    return (
      <section className={styles.errorState} role="alert">
        <p className={styles.eyebrow}>Deck unavailable</p>
        <h1>We could not open this deck.</h1>
        <p>{error}</p>
        <Link to="/">Back to decks</Link>
      </section>
    )
  }

  const { deck, lessonCount, cardCount, dueCount } = summary

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumbs}>
        <Link to="/">Decks</Link>
        <span aria-hidden="true">/</span>
        <span>{deck.name}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            {myLanguageLabels[deck.myLanguage]} →{' '}
            {targetLanguageLabels[deck.targetLanguage]}
          </p>
          <h1>{deck.name}</h1>
          <p>{deck.description}</p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.studyButton} to={`/study/deck/${deck.id}`}>
            Study this deck
          </Link>
          <button type="button" onClick={() => setIsEditing(true)}>
            Edit deck
          </button>
        </div>
      </section>

      {isEditing ? (
        <DeckForm
          key={deck.updatedAt}
          deck={deck}
          isLanguageLocked={cardCount > 0}
          onCancel={() => setIsEditing(false)}
          onSubmit={saveDeck}
        />
      ) : null}

      <section className={styles.summaryGrid} aria-label="Deck summary">
        <article>
          <span>Lessons</span>
          <strong>{lessonCount}</strong>
        </article>
        <article>
          <span>Cards</span>
          <strong>{cardCount}</strong>
        </article>
        <article>
          <span>Due now</span>
          <strong>{dueCount}</strong>
        </article>
        <article>
          <span>My Language</span>
          <strong>{myLanguageLabels[deck.myLanguage]}</strong>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.lessons}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Course structure</p>
              <h2>Lessons</h2>
            </div>
            <span>{lessonCount}</span>
          </div>
          <div className={styles.emptyLessons}>
            <strong>No lessons yet</strong>
            <p>
              Lesson creation is the next roadmap milestone. This deck is ready
              for it.
            </p>
          </div>
        </div>

        <aside className={styles.quickLinks}>
          <p className={styles.eyebrow}>Deck actions</p>
          <h2>Keep moving</h2>
          <Link to={`/decks/${deck.id}/cards`}>
            Browse cards <span aria-hidden="true">→</span>
          </Link>
          <Link to={`/study/deck/${deck.id}`}>
            Study due cards <span aria-hidden="true">→</span>
          </Link>
          <button
            className={styles.archiveButton}
            type="button"
            onClick={() => void confirmArchive()}
          >
            Archive deck
          </button>
        </aside>
      </section>
    </div>
  )
}
