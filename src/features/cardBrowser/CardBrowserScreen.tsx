import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  archiveCard,
  createCardWithInitialReviewState,
  findCardDuplicates,
  listActiveCardsByDeckId,
  suspendCard,
  unsuspendCard,
  updateCard,
} from '../../db/repositories/cardRepository'
import { getDeckSummary } from '../../db/repositories/deckRepository'
import { listActiveLessonsByDeckId } from '../../db/repositories/lessonRepository'
import { getSettings } from '../../db/repositories/settingsRepository'
import { getDutchDisplayText } from '../../domain/cards/cardDisplay'
import type {
  Card,
  CreateCardInput,
  UpdateCardInput,
} from '../../domain/cards/cardTypes'
import { myLanguageLabels, type DeckSummary } from '../../domain/decks/deckTypes'
import type { DuplicateDetectionResult } from '../../domain/duplicates/duplicateDetection'
import { normalizeText } from '../../domain/duplicates/normalizeText'
import type { Lesson } from '../../domain/lessons/lessonTypes'
import type { AppSettings } from '../../domain/settings/settingsTypes'
import { CardForm } from '../cardEditor/CardForm'
import { CardPreview } from './CardPreview'
import styles from './CardBrowserScreen.module.css'

type CardBrowserData = {
  deckSummary: DeckSummary
  lessons: Lesson[]
  cards: Card[]
  settings: AppSettings
}

export function CardBrowserScreen() {
  const { deckId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialLessonId = searchParams.get('lessonId') ?? ''
  const [data, setData] = useState<CardBrowserData>()
  const [search, setSearch] = useState('')
  const [lessonFilter, setLessonFilter] = useState(initialLessonId)
  const [isFormOpen, setIsFormOpen] = useState(
    searchParams.get('create') === '1',
  )
  const [editingCard, setEditingCard] = useState<Card>()
  const [previewCard, setPreviewCard] = useState<Card>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!deckId) {
      setError('This deck address is invalid.')
      setIsLoading(false)
      return
    }

    setError('')

    try {
      const [deckSummary, lessons, cards, settings] = await Promise.all([
        getDeckSummary(deckId),
        listActiveLessonsByDeckId(deckId),
        listActiveCardsByDeckId(deckId),
        getSettings(),
      ])

      if (!deckSummary) {
        setData(undefined)
        setError('This deck was not found or has been archived.')
        return
      }

      setData({ deckSummary, lessons, cards, settings })
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Cards could not be loaded.',
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
      listActiveLessonsByDeckId(deckId),
      listActiveCardsByDeckId(deckId),
      getSettings(),
    ])
      .then(([deckSummary, lessons, cards, settings]) => {
        if (!isActive) {
          return
        }

        if (!deckSummary) {
          setError('This deck was not found or has been archived.')
          return
        }

        setData({ deckSummary, lessons, cards, settings })
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Cards could not be loaded.',
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

  const filteredCards = useMemo(() => {
    if (!data) {
      return []
    }

    const normalizedSearch = normalizeText(search)
    return data.cards.filter((card) => {
      const matchesLesson = !lessonFilter || card.lessonId === lessonFilter
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(card.frontText).includes(normalizedSearch) ||
        normalizeText(getDutchDisplayText(card)).includes(normalizedSearch) ||
        normalizeText(card.notes).includes(normalizedSearch)

      return matchesLesson && matchesSearch
    })
  }, [data, lessonFilter, search])

  function openCreateForm() {
    setEditingCard(undefined)
    setIsFormOpen(true)
  }

  function openEditForm(card: Card) {
    setEditingCard(card)
    setIsFormOpen(true)
  }

  function closeForm() {
    setEditingCard(undefined)
    setIsFormOpen(false)
  }

  async function saveCard(input: UpdateCardInput) {
    if (!deckId) {
      return
    }

    if (editingCard) {
      await updateCard(editingCard.id, input)
    } else {
      await createCardWithInitialReviewState({ deckId, ...input })
    }

    closeForm()
    navigate(
      lessonFilter
        ? `/decks/${deckId}/cards?lessonId=${lessonFilter}`
        : `/decks/${deckId}/cards`,
      { replace: true },
    )
    await loadData()
  }

  async function checkDuplicates(
    input: CreateCardInput,
    excludeCardId?: string,
  ): Promise<DuplicateDetectionResult> {
    return findCardDuplicates(input, excludeCardId)
  }

  async function confirmArchive(card: Card) {
    if (!window.confirm(`Archive the card “${card.frontText}”?`)) {
      return
    }

    try {
      await archiveCard(card.id)
      await loadData()
    } catch (archiveError: unknown) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : 'The card could not be archived.',
      )
    }
  }

  async function toggleSuspended(card: Card) {
    try {
      if (card.suspendedAt) {
        await unsuspendCard(card.id)
      } else {
        await suspendCard(card.id)
      }
      await loadData()
    } catch (suspendError: unknown) {
      setError(
        suspendError instanceof Error
          ? suspendError.message
          : 'The card could not be updated.',
      )
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading cards…</p>
  }

  if (error || !data) {
    return (
      <section className={styles.errorState} role="alert">
        <p className={styles.eyebrow}>Cards unavailable</p>
        <h1>We could not open this card browser.</h1>
        <p>{error}</p>
        <Link to={deckId ? `/decks/${deckId}` : '/'}>Back to deck</Link>
      </section>
    )
  }

  const { deck } = data.deckSummary
  const lessonById = new Map(
    data.lessons.map((lesson) => [lesson.id, lesson]),
  )

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumbs}>
        <Link to="/">Decks</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/decks/${deck.id}`}>{deck.name}</Link>
        <span aria-hidden="true">/</span>
        <span>Cards</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Card browser</p>
          <h1>{deck.name}</h1>
          <p>
            {myLanguageLabels[deck.myLanguage]} prompts with Dutch answers.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          disabled={data.lessons.length === 0}
        >
          Create card
        </button>
      </section>

      {data.lessons.length === 0 ? (
        <div className={styles.noLessons}>
          <strong>Create a lesson before adding cards.</strong>
          <Link to={`/decks/${deck.id}`}>Return to deck</Link>
        </div>
      ) : null}

      {isFormOpen && data.lessons.length > 0 ? (
        <CardForm
          key={editingCard?.id ?? `new-${initialLessonId}`}
          deck={deck}
          lessons={data.lessons}
          card={editingCard}
          initialLessonId={editingCard?.lessonId ?? initialLessonId}
          onCancel={closeForm}
          onCheckDuplicates={checkDuplicates}
          onSubmit={saveCard}
        />
      ) : null}

      {previewCard ? (
        <CardPreview
          key={previewCard.id}
          card={previewCard}
          deck={deck}
          settings={data.settings}
          onClose={() => setPreviewCard(undefined)}
        />
      ) : null}

      <section className={styles.filters} aria-label="Card filters">
        <label>
          <span>Search cards</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search prompts, Dutch, or notes"
          />
        </label>
        <label>
          <span>Lesson</span>
          <select
            value={lessonFilter}
            onChange={(event) => setLessonFilter(event.target.value)}
          >
            <option value="">All lessons</option>
            {data.lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.order}. {lesson.title}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className={styles.resultHeading}>
        <h2>Cards</h2>
        <span>
          {filteredCards.length} {filteredCards.length === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {filteredCards.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>
            {data.cards.length === 0
              ? 'No cards yet'
              : 'No cards match these filters'}
          </strong>
          <p>
            {data.cards.length === 0
              ? 'Create the first My Language → Dutch card for this deck.'
              : 'Try another search or lesson.'}
          </p>
          {data.cards.length === 0 && data.lessons.length > 0 ? (
            <button type="button" onClick={openCreateForm}>
              Create first card
            </button>
          ) : null}
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filteredCards.map((card) => {
            const lesson = lessonById.get(card.lessonId)

            return (
              <article
                className={`${styles.card} ${
                  card.suspendedAt ? styles.suspendedCard : ''
                }`}
                key={card.id}
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardMeta}>
                    <span>{lesson?.title ?? 'Unknown lesson'}</span>
                    {card.suspendedAt ? <span>Suspended</span> : null}
                  </div>
                  <div className={styles.cardSides}>
                    <div>
                      <span>{myLanguageLabels[deck.myLanguage]}</span>
                      <strong>{card.frontText}</strong>
                    </div>
                    <div>
                      <span>Dutch</span>
                      <strong>{getDutchDisplayText(card)}</strong>
                    </div>
                  </div>
                  {card.notes ? <p className={styles.notes}>{card.notes}</p> : null}
                </div>
                <div className={styles.cardActions}>
                  <button type="button" onClick={() => setPreviewCard(card)}>
                    Preview
                  </button>
                  <button type="button" onClick={() => openEditForm(card)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => void toggleSuspended(card)}>
                    {card.suspendedAt ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <button
                    className={styles.archiveButton}
                    type="button"
                    onClick={() => void confirmArchive(card)}
                  >
                    Archive
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
