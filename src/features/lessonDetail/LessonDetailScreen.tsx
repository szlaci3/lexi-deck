import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getDeckSummary } from '../../db/repositories/deckRepository'
import {
  archiveLesson,
  getLessonSummary,
  updateLesson,
} from '../../db/repositories/lessonRepository'
import {
  myLanguageLabels,
  targetLanguageLabels,
  type DeckSummary,
} from '../../domain/decks/deckTypes'
import type {
  CreateLessonInput,
  LessonSummary,
} from '../../domain/lessons/lessonTypes'
import { LessonForm } from './LessonForm'
import styles from './LessonDetailScreen.module.css'

type LessonPageData = {
  deckSummary: DeckSummary
  lessonSummary: LessonSummary
}

export function LessonDetailScreen() {
  const { deckId, lessonId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<LessonPageData>()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLesson = useCallback(async () => {
    if (!deckId || !lessonId) {
      setError('This lesson address is invalid.')
      setIsLoading(false)
      return
    }

    setError('')

    try {
      const [deckSummary, lessonSummary] = await Promise.all([
        getDeckSummary(deckId),
        getLessonSummary(lessonId),
      ])

      if (
        !deckSummary ||
        !lessonSummary ||
        lessonSummary.lesson.deckId !== deckId
      ) {
        setData(undefined)
        setError('This lesson was not found in the selected deck.')
        return
      }

      setData({ deckSummary, lessonSummary })
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'The lesson could not be loaded.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [deckId, lessonId])

  useEffect(() => {
    let isActive = true

    if (!deckId || !lessonId) {
      return
    }

    Promise.all([getDeckSummary(deckId), getLessonSummary(lessonId)])
      .then(([deckSummary, lessonSummary]) => {
        if (!isActive) {
          return
        }

        if (
          !deckSummary ||
          !lessonSummary ||
          lessonSummary.lesson.deckId !== deckId
        ) {
          setError('This lesson was not found in the selected deck.')
          return
        }

        setData({ deckSummary, lessonSummary })
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'The lesson could not be loaded.',
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
  }, [deckId, lessonId])

  async function saveLesson(input: CreateLessonInput) {
    if (!lessonId) {
      return
    }

    await updateLesson(lessonId, input)
    setIsEditing(false)
    await loadLesson()
  }

  async function confirmArchive() {
    if (!data) {
      return
    }

    const shouldArchive = window.confirm(
      `Archive “${data.lessonSummary.lesson.title}”? It will disappear from this deck.`,
    )

    if (!shouldArchive) {
      return
    }

    try {
      await archiveLesson(data.lessonSummary.lesson.id)
      navigate(`/decks/${data.deckSummary.deck.id}`)
    } catch (archiveError: unknown) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : 'The lesson could not be archived.',
      )
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading lesson…</p>
  }

  if (error || !data) {
    return (
      <section className={styles.errorState} role="alert">
        <p className={styles.eyebrow}>Lesson unavailable</p>
        <h1>We could not open this lesson.</h1>
        <p>{error}</p>
        <Link to={deckId ? `/decks/${deckId}` : '/'}>Back to deck</Link>
      </section>
    )
  }

  const { deck } = data.deckSummary
  const { lesson, cardCount, dueCount } = data.lessonSummary

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumbs}>
        <Link to="/">Decks</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/decks/${deck.id}`}>{deck.name}</Link>
        <span aria-hidden="true">/</span>
        <span>{lesson.title}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Lesson {lesson.order}</p>
          <h1>{lesson.title}</h1>
          <p>{lesson.description}</p>
        </div>
        <div className={styles.heroActions}>
          <Link
            className={styles.createCardButton}
            to={`/decks/${deck.id}/cards?lessonId=${lesson.id}&create=1`}
          >
            Create card
          </Link>
          <button type="button" onClick={() => setIsEditing(true)}>
            Edit lesson
          </button>
        </div>
      </section>

      {isEditing ? (
        <LessonForm
          key={lesson.updatedAt}
          lesson={lesson}
          onCancel={() => setIsEditing(false)}
          onSubmit={saveLesson}
        />
      ) : null}

      <section className={styles.summaryGrid} aria-label="Lesson summary">
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
        <article>
          <span>Target</span>
          <strong>{targetLanguageLabels[deck.targetLanguage]}</strong>
        </article>
      </section>

      <section className={styles.cardArea}>
        <div>
          <p className={styles.eyebrow}>Flashcards</p>
          <h2>Lesson cards</h2>
          <p>
            Create and manage {myLanguageLabels[deck.myLanguage]} → Dutch
            flashcards for this lesson.
          </p>
        </div>
        <Link to={`/decks/${deck.id}/cards?lessonId=${lesson.id}`}>
          Browse lesson cards
        </Link>
      </section>

      <button
        className={styles.archiveButton}
        type="button"
        onClick={() => void confirmArchive()}
      >
        Archive lesson
      </button>
    </div>
  )
}
