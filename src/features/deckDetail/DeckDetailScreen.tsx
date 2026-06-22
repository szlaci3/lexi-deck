import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  archiveDeck,
  getDeckSummary,
  updateDeck,
} from '../../db/repositories/deckRepository'
import {
  archiveLesson,
  createLesson,
  listActiveLessonSummariesByDeckId,
  updateLesson,
} from '../../db/repositories/lessonRepository'
import {
  myLanguageLabels,
  targetLanguageLabels,
  type CreateDeckInput,
  type DeckSummary,
} from '../../domain/decks/deckTypes'
import type {
  CreateLessonInput,
  Lesson,
  LessonSummary,
} from '../../domain/lessons/lessonTypes'
import { DeckForm } from '../dashboard/DeckForm'
import { LessonForm } from '../lessonDetail/LessonForm'
import styles from './DeckDetailScreen.module.css'

export function DeckDetailScreen() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DeckSummary>()
  const [lessonSummaries, setLessonSummaries] = useState<LessonSummary[]>([])
  const [isEditingDeck, setIsEditingDeck] = useState(false)
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson>()
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
      const [nextSummary, nextLessons] = await Promise.all([
        getDeckSummary(deckId),
        listActiveLessonSummariesByDeckId(deckId),
      ])
      if (!nextSummary) {
        setError('This deck was not found or has been archived.')
      }
      setSummary(nextSummary)
      setLessonSummaries(nextLessons)
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

    Promise.all([
      getDeckSummary(deckId),
      listActiveLessonSummariesByDeckId(deckId),
    ])
      .then(([nextSummary, nextLessons]) => {
        if (!isActive) {
          return
        }

        if (!nextSummary) {
          setError('This deck was not found or has been archived.')
        }
        setSummary(nextSummary)
        setLessonSummaries(nextLessons)
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
    setIsEditingDeck(false)
    await loadDeck()
  }

  function openCreateLessonForm() {
    setEditingLesson(undefined)
    setIsLessonFormOpen(true)
  }

  function openEditLessonForm(lesson: Lesson) {
    setEditingLesson(lesson)
    setIsLessonFormOpen(true)
  }

  function closeLessonForm() {
    setEditingLesson(undefined)
    setIsLessonFormOpen(false)
  }

  async function saveLesson(input: CreateLessonInput) {
    if (!deckId) {
      return
    }

    if (editingLesson) {
      await updateLesson(editingLesson.id, input)
    } else {
      await createLesson(deckId, input)
    }

    closeLessonForm()
    await loadDeck()
  }

  async function confirmArchiveLesson(lesson: Lesson) {
    const shouldArchive = window.confirm(
      `Archive “${lesson.title}”? It will disappear from this deck.`,
    )

    if (!shouldArchive) {
      return
    }

    try {
      await archiveLesson(lesson.id)
      await loadDeck()
    } catch (archiveError: unknown) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : 'The lesson could not be archived.',
      )
    }
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
            Study {dueCount} due
          </Link>
          <button type="button" onClick={() => setIsEditingDeck(true)}>
            Edit deck
          </button>
        </div>
      </section>

      {isEditingDeck ? (
        <DeckForm
          key={deck.updatedAt}
          deck={deck}
          isLanguageLocked={cardCount > 0}
          onCancel={() => setIsEditingDeck(false)}
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
            <button type="button" onClick={openCreateLessonForm}>
              Add lesson
            </button>
          </div>

          {isLessonFormOpen ? (
            <div className={styles.lessonForm}>
              <LessonForm
                key={editingLesson?.id ?? 'new-lesson'}
                lesson={editingLesson}
                onCancel={closeLessonForm}
                onSubmit={saveLesson}
              />
            </div>
          ) : null}

          {lessonSummaries.length === 0 ? (
            <div className={styles.emptyLessons}>
              <strong>No lessons yet</strong>
              <p>
                Add the first lesson or textbook unit for this deck.
              </p>
              <button type="button" onClick={openCreateLessonForm}>
                Create first lesson
              </button>
            </div>
          ) : (
            <div className={styles.lessonList}>
              {lessonSummaries.map(({ lesson, cardCount: lessonCardCount, dueCount: lessonDueCount }) => (
                <article className={styles.lessonCard} key={lesson.id}>
                  <Link
                    className={styles.lessonLink}
                    to={`/decks/${deck.id}/lessons/${lesson.id}`}
                  >
                    <span>Lesson {lesson.order}</span>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.description}</p>
                    <dl>
                      <div>
                        <dt>Cards</dt>
                        <dd>{lessonCardCount}</dd>
                      </div>
                      <div>
                        <dt>Due</dt>
                        <dd>{lessonDueCount}</dd>
                      </div>
                    </dl>
                  </Link>
                  <div className={styles.lessonActions}>
                    <button
                      type="button"
                      onClick={() => openEditLessonForm(lesson)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.archiveLessonButton}
                      type="button"
                      onClick={() => void confirmArchiveLesson(lesson)}
                    >
                      Archive
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
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
