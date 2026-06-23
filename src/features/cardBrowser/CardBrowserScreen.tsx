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
  createImageCardWithInitialReviewState,
  createReverseCard,
  findCardDuplicates,
  listActiveCardsByDeckId,
  suspendCard,
  unsuspendCard,
  updateCard,
} from '../../db/repositories/cardRepository'
import { getDeckSummary } from '../../db/repositories/deckRepository'
import { listActiveLessonsByDeckId } from '../../db/repositories/lessonRepository'
import { getSettings } from '../../db/repositories/settingsRepository'
import {
  getSourceImageById,
  getSourceImagesByIds,
} from '../../db/repositories/sourceImageRepository'
import { getDutchDisplayText } from '../../domain/cards/cardDisplay'
import { getCardPresentation } from '../../domain/cards/cardPresentation'
import type {
  Card,
  CreateCardInput,
  CreateImageCardInput,
  UpdateCardInput,
} from '../../domain/cards/cardTypes'
import { myLanguageLabels, type DeckSummary } from '../../domain/decks/deckTypes'
import type { DuplicateDetectionResult } from '../../domain/duplicates/duplicateDetection'
import { normalizeText } from '../../domain/duplicates/normalizeText'
import type { Lesson } from '../../domain/lessons/lessonTypes'
import type { SourceImage } from '../../domain/media/mediaTypes'
import type { AppSettings } from '../../domain/settings/settingsTypes'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import { CardForm } from '../cardEditor/CardForm'
import { ImageCardForm } from '../cardEditor/ImageCardForm'
import { CardPreview } from './CardPreview'
import styles from './CardBrowserScreen.module.css'

type CardBrowserData = {
  deckSummary: DeckSummary
  lessons: Lesson[]
  cards: Card[]
  settings: AppSettings
  sourceImages: Map<string, SourceImage>
  selectedImage?: SourceImage
}

export function CardBrowserScreen() {
  const { deckId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialLessonId = searchParams.get('lessonId') ?? ''
  const selectedImageId = searchParams.get('imageId') ?? ''
  const [data, setData] = useState<CardBrowserData>()
  const [search, setSearch] = useState('')
  const [lessonFilter, setLessonFilter] = useState(initialLessonId)
  const [isFormOpen, setIsFormOpen] = useState(
    searchParams.get('create') === '1',
  )
  const [isImageFormOpen, setIsImageFormOpen] = useState(
    searchParams.get('createImage') === '1',
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
      const [deckSummary, lessons, cards, settings, selectedImage] =
        await Promise.all([
        getDeckSummary(deckId),
        listActiveLessonsByDeckId(deckId),
        listActiveCardsByDeckId(deckId),
        getSettings(),
          selectedImageId
            ? getSourceImageById(selectedImageId)
            : Promise.resolve(undefined),
        ])

      if (!deckSummary) {
        setData(undefined)
        setError('This deck was not found or has been archived.')
        return
      }

      const sourceImages = await getSourceImagesByIds(
        cards.flatMap((card) => (card.frontImageId ? [card.frontImageId] : [])),
      )
      setData({
        deckSummary,
        lessons,
        cards,
        settings,
        sourceImages,
        selectedImage:
          selectedImage &&
          !selectedImage.archivedAt &&
          selectedImage.deckId === deckId
            ? selectedImage
            : undefined,
      })
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Cards could not be loaded.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [deckId, selectedImageId])

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
      selectedImageId
        ? getSourceImageById(selectedImageId)
        : Promise.resolve(undefined),
    ])
      .then(async ([deckSummary, lessons, cards, settings, selectedImage]) => {
        if (!isActive) {
          return
        }

        if (!deckSummary) {
          setError('This deck was not found or has been archived.')
          return
        }

        const sourceImages = await getSourceImagesByIds(
          cards.flatMap((card) =>
            card.frontImageId ? [card.frontImageId] : [],
          ),
        )
        if (!isActive) {
          return
        }
        setData({
          deckSummary,
          lessons,
          cards,
          settings,
          sourceImages,
          selectedImage:
            selectedImage &&
            !selectedImage.archivedAt &&
            selectedImage.deckId === deckId
              ? selectedImage
              : undefined,
        })
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
  }, [deckId, selectedImageId])

  const filteredCards = useMemo(() => {
    if (!data) {
      return []
    }

    const normalizedSearch = normalizeText(search)
    return data.cards.filter((card) => {
      const matchesLesson = !lessonFilter || card.lessonId === lessonFilter
      const presentation = getCardPresentation(card)
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(card.frontText).includes(normalizedSearch) ||
        normalizeText(getDutchDisplayText(card)).includes(normalizedSearch) ||
        normalizeText(presentation.answerText).includes(normalizedSearch) ||
        normalizeText(card.notes).includes(normalizedSearch)

      return matchesLesson && matchesSearch
    })
  }, [data, lessonFilter, search])

  function openCreateForm() {
    setEditingCard(undefined)
    setIsImageFormOpen(false)
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

  function closeImageForm() {
    setIsImageFormOpen(false)
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

  async function saveImageCard(input: CreateImageCardInput) {
    if (!deckId) return
    await createImageCardWithInitialReviewState(input)
    closeImageForm()
    navigate(`/decks/${deckId}/cards?lessonId=${input.lessonId}`, {
      replace: true,
    })
    await loadData()
  }

  async function generateReverse(card: Card) {
    try {
      await createReverseCard(card.id)
      await loadData()
    } catch (reverseError: unknown) {
      setError(
        reverseError instanceof Error
          ? reverseError.message
          : 'The reverse card could not be created.',
      )
    }
  }

  async function checkDuplicates(
    input: CreateCardInput,
    excludeCardId?: string,
  ): Promise<DuplicateDetectionResult> {
    return findCardDuplicates(input, excludeCardId)
  }

  async function confirmArchive(card: Card) {
    const presentation = getCardPresentation(card)
    const label =
      presentation.promptKind === 'image'
        ? 'this image card'
        : `the card “${presentation.promptText}”`
    if (!window.confirm(`Archive ${label}?`)) {
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
            Browse text, image, and reverse study directions for this deck.
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

      {isImageFormOpen && data.selectedImage ? (
        <ImageCardForm
          deck={deck}
          image={data.selectedImage}
          onCancel={closeImageForm}
          onSubmit={saveImageCard}
        />
      ) : null}

      {isImageFormOpen && !data.selectedImage ? (
        <p className={styles.inlineError} role="alert">
          The selected source image is unavailable.
        </p>
      ) : null}

      {previewCard ? (
        <CardPreview
          key={previewCard.id}
          card={previewCard}
          deck={deck}
          settings={data.settings}
          image={
            previewCard.frontImageId
              ? data.sourceImages.get(previewCard.frontImageId)
              : undefined
          }
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
              ? 'Create the first card for this deck.'
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
              <CardBrowserItem
                key={card.id}
                card={card}
                deckLanguageLabel={myLanguageLabels[deck.myLanguage]}
                lessonTitle={lesson?.title ?? 'Unknown lesson'}
                image={
                  card.frontImageId
                    ? data.sourceImages.get(card.frontImageId)
                    : undefined
                }
                onPreview={() => setPreviewCard(card)}
                onEdit={() => openEditForm(card)}
                onReverse={() => void generateReverse(card)}
                canCreateReverse={
                  !card.relatedCardId ||
                  !data.cards.some(
                    (relatedCard) => relatedCard.id === card.relatedCardId,
                  )
                }
                onToggleSuspended={() => void toggleSuspended(card)}
                onArchive={() => void confirmArchive(card)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

type CardBrowserItemProps = {
  card: Card
  deckLanguageLabel: string
  lessonTitle: string
  image?: SourceImage
  onPreview: () => void
  onEdit: () => void
  onReverse: () => void
  canCreateReverse: boolean
  onToggleSuspended: () => void
  onArchive: () => void
}

function CardBrowserItem({
  card,
  deckLanguageLabel,
  lessonTitle,
  image,
  onPreview,
  onEdit,
  onReverse,
  canCreateReverse,
  onToggleSuspended,
  onArchive,
}: CardBrowserItemProps) {
  const presentation = getCardPresentation(card)

  return (
    <article
      className={`${styles.card} ${
        card.suspendedAt ? styles.suspendedCard : ''
      }`}
    >
      <div className={styles.cardContent}>
        <div className={styles.cardMeta}>
          <span>{lessonTitle}</span>
          <span>{formatCardType(card.cardType)}</span>
          {card.suspendedAt ? <span>Suspended</span> : null}
        </div>
        <div className={styles.cardSides}>
          <div>
            <span>
              {formatPresentationLabel(
                presentation.promptLanguage,
                deckLanguageLabel,
              )}
            </span>
            {presentation.promptKind === 'image' ? (
              image ? (
                <CardImage image={image} />
              ) : (
                <strong>Image unavailable</strong>
              )
            ) : (
              <strong>{presentation.promptText}</strong>
            )}
          </div>
          <div>
            <span>
              {formatPresentationLabel(
                presentation.answerLanguage,
                deckLanguageLabel,
              )}
            </span>
            {presentation.answerKind === 'image' ? (
              image ? (
                <CardImage image={image} />
              ) : (
                <strong>Image unavailable</strong>
              )
            ) : (
              <strong>{presentation.answerText}</strong>
            )}
          </div>
        </div>
        {card.notes ? <p className={styles.notes}>{card.notes}</p> : null}
      </div>
      <div className={styles.cardActions}>
        <button type="button" onClick={onPreview}>
          Preview
        </button>
        {card.cardType === 'myLanguageToDutch' ? (
          <>
            <button type="button" onClick={onEdit}>
              Edit
            </button>
            {canCreateReverse ? (
              <button type="button" onClick={onReverse}>
                Create reverse
              </button>
            ) : null}
          </>
        ) : null}
        <button type="button" onClick={onToggleSuspended}>
          {card.suspendedAt ? 'Unsuspend' : 'Suspend'}
        </button>
        <button
          className={styles.archiveButton}
          type="button"
          onClick={onArchive}
        >
          Archive
        </button>
      </div>
    </article>
  )
}

function CardImage({ image }: { image: SourceImage }) {
  const url = useBlobUrl(image.blob)
  return (
    <img
      className={styles.cardImage}
      src={url}
      alt={`Card prompt from ${image.fileName}`}
      loading="lazy"
    />
  )
}

function formatPresentationLabel(
  language: 'myLanguage' | 'dutch' | 'image',
  myLanguageLabel: string,
): string {
  if (language === 'dutch') return 'Dutch'
  if (language === 'image') return 'Image'
  return myLanguageLabel
}

function formatCardType(cardType: Card['cardType']): string {
  const labels: Record<Card['cardType'], string> = {
    myLanguageToDutch: 'My Language → Dutch',
    imageToDutch: 'Image → Dutch',
    dutchToMyLanguage: 'Dutch → My Language',
    dutchToImage: 'Dutch → Image',
  }
  return labels[cardType]
}
