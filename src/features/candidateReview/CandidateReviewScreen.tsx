import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  convertCandidateToCard,
  createCandidateFromSelection,
  extractCandidatesFromOcrText,
  listCandidatesByOcrTextId,
  markCandidateKnown,
  setCandidateStatus,
  updateCandidate,
} from '../../db/repositories/candidateRepository'
import { getDeckById } from '../../db/repositories/deckRepository'
import { getLessonById } from '../../db/repositories/lessonRepository'
import { getOcrTextBySourceImageId } from '../../db/repositories/ocrRepository'
import { getSourceImageById } from '../../db/repositories/sourceImageRepository'
import {
  dutchArticleLabels,
  type DutchArticle,
} from '../../domain/cards/cardTypes'
import { formatDutchText } from '../../domain/cards/cardDisplay'
import type { Deck } from '../../domain/decks/deckTypes'
import type { Lesson } from '../../domain/lessons/lessonTypes'
import type { SourceImage } from '../../domain/media/mediaTypes'
import type { OcrText } from '../../domain/ocr/ocrTypes'
import type {
  CandidateDuplicateStatus,
  VocabularyCandidate,
} from '../../domain/vocabulary/candidateTypes'
import styles from './CandidateReviewScreen.module.css'

type CandidatePageData = {
  deck: Deck
  lesson: Lesson
  sourceImage: SourceImage
  ocrText: OcrText
  candidates: VocabularyCandidate[]
}

export function CandidateReviewScreen() {
  const { deckId, lessonId, sourceImageId } = useParams()
  const [data, setData] = useState<CandidatePageData>()
  const [manualText, setManualText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!deckId || !lessonId || !sourceImageId) {
      return
    }

    let isActive = true
    Promise.all([
      getDeckById(deckId),
      getLessonById(lessonId),
      getSourceImageById(sourceImageId),
      getOcrTextBySourceImageId(sourceImageId),
    ])
      .then(async ([deck, lesson, sourceImage, ocrText]) => {
        if (
          !deck ||
          deck.archivedAt ||
          !lesson ||
          lesson.archivedAt ||
          lesson.deckId !== deckId ||
          !sourceImage ||
          sourceImage.archivedAt ||
          sourceImage.deckId !== deckId ||
          sourceImage.lessonId !== lessonId ||
          !ocrText
        ) {
          throw new Error(
            'Complete OCR for this source image before reviewing candidates.',
          )
        }
        const candidates = await listCandidatesByOcrTextId(ocrText.id)
        return { deck, lesson, sourceImage, ocrText, candidates }
      })
      .then((pageData) => {
        if (isActive) {
          setData(pageData)
        }
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Vocabulary candidates could not be loaded.',
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
  }, [deckId, lessonId, sourceImageId])

  async function extractCandidates() {
    if (!data) return
    setIsExtracting(true)
    setError('')
    setMessage('')
    try {
      const candidates = await extractCandidatesFromOcrText(data.ocrText.id)
      setData({ ...data, candidates })
      setMessage(
        candidates.length === 0
          ? 'No candidate lines were found.'
          : `${candidates.length} ${
              candidates.length === 1 ? 'candidate is' : 'candidates are'
            } ready for review.`,
      )
    } catch (extractError: unknown) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : 'Candidates could not be extracted.',
      )
    } finally {
      setIsExtracting(false)
    }
  }

  async function addManualCandidate() {
    if (!data) return
    setIsAdding(true)
    setError('')
    setMessage('')
    try {
      const candidate = await createCandidateFromSelection(
        data.ocrText.id,
        manualText,
      )
      setData({
        ...data,
        candidates: [...data.candidates, candidate],
      })
      setManualText('')
      setMessage('Selected text added as a candidate.')
    } catch (addError: unknown) {
      setError(
        addError instanceof Error
          ? addError.message
          : 'The selected text could not be added.',
      )
    } finally {
      setIsAdding(false)
    }
  }

  function replaceCandidate(candidate: VocabularyCandidate) {
    setData((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((existing) =>
              existing.id === candidate.id ? candidate : existing,
            ),
          }
        : current,
    )
  }

  if (!deckId || !lessonId || !sourceImageId) {
    return (
      <section className={styles.errorState} role="alert">
        <h1>This candidate review address is invalid.</h1>
        <Link to="/">Back to decks</Link>
      </section>
    )
  }

  if (isLoading) {
    return <p className={styles.status}>Loading vocabulary candidates…</p>
  }

  if (!data) {
    return (
      <section className={styles.errorState} role="alert">
        <p className={styles.eyebrow}>Candidates unavailable</p>
        <h1>We could not open candidate review.</h1>
        <p>{error}</p>
        <Link
          to={`/decks/${deckId}/lessons/${lessonId}/images/${sourceImageId}/ocr`}
        >
          Back to OCR review
        </Link>
      </section>
    )
  }

  const activeCount = data.candidates.filter(
    (candidate) =>
      candidate.status === 'pending' || candidate.status === 'approved',
  ).length

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/">Decks</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/decks/${data.deck.id}`}>{data.deck.name}</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/decks/${data.deck.id}/lessons/${data.lesson.id}`}>
          {data.lesson.title}
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to={`/decks/${data.deck.id}/lessons/${data.lesson.id}/images/${data.sourceImage.id}/ocr`}
        >
          OCR
        </Link>
        <span aria-hidden="true">/</span>
        <span>Candidates</span>
      </nav>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Vocabulary candidates</p>
          <h1>Review before creating cards</h1>
          <p>
            Extraction only proposes vocabulary. Edit and approve each item
            before LexiDeck creates a study card.
          </p>
        </div>
        <strong>{activeCount} to review</strong>
      </section>

      {message ? (
        <p className={styles.success} role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <section className={styles.extractionPanel}>
        <div>
          <p className={styles.eyebrow}>Deterministic extraction</p>
          <h2>Propose vocabulary from OCR lines</h2>
          <p>
            Save OCR corrections first. Visible articles and vocabulary-list
            separators are parsed without an LLM.
          </p>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          disabled={isExtracting}
          onClick={() => void extractCandidates()}
        >
          {isExtracting ? 'Extracting…' : 'Extract candidates'}
        </button>
      </section>

      <section className={styles.manualPanel}>
        <label>
          Add selected OCR text
          <textarea
            rows={3}
            value={manualText}
            placeholder="de fiets — bicycle"
            onChange={(event) => setManualText(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={isAdding || !manualText.trim()}
          onClick={() => void addManualCandidate()}
        >
          {isAdding ? 'Adding…' : 'Add candidate'}
        </button>
      </section>

      <section className={styles.candidateArea}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Candidate review</p>
            <h2>{data.candidates.length} proposals</h2>
          </div>
          <Link to={`/decks/${data.deck.id}/cards`}>
            Browse existing cards
          </Link>
        </div>

        {data.candidates.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>No candidates yet</strong>
            <p>Extract the saved OCR text or add a selected line manually.</p>
          </div>
        ) : (
          <div className={styles.candidateList}>
            {data.candidates.map((candidate) => (
              <CandidateEditor
                key={`${candidate.id}-${candidate.updatedAt}`}
                candidate={candidate}
                onChanged={replaceCandidate}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

type CandidateEditorProps = {
  candidate: VocabularyCandidate
  onChanged: (candidate: VocabularyCandidate) => void
}

function CandidateEditor({ candidate, onChanged }: CandidateEditorProps) {
  const [rawText, setRawText] = useState(candidate.rawText)
  const [article, setArticle] = useState<DutchArticle>(candidate.article)
  const [meaning, setMeaning] = useState(candidate.myLanguageMeaning)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  async function perform(
    action: () => Promise<VocabularyCandidate>,
  ): Promise<void> {
    setIsWorking(true)
    setError('')
    try {
      onChanged(await action())
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'The candidate could not be updated.',
      )
    } finally {
      setIsWorking(false)
    }
  }

  function saveCurrent(): Promise<VocabularyCandidate> {
    return updateCandidate(candidate.id, {
      rawText,
      article,
      myLanguageMeaning: meaning,
    })
  }

  const completed =
    candidate.status === 'converted' ||
    candidate.status === 'known' ||
    candidate.status === 'rejected'

  return (
    <article className={styles.candidateCard}>
      <div className={styles.candidateHeading}>
        <div>
          <span className={styles.statusPill}>{formatStatus(candidate.status)}</span>
          <span className={duplicateClass(candidate.duplicateStatus)}>
            {formatDuplicateStatus(candidate.duplicateStatus)}
          </span>
        </div>
        <strong>{candidate.candidateType}</strong>
      </div>

      <div className={styles.editorGrid}>
        <label>
          Article
          <select
            value={article}
            disabled={completed}
            onChange={(event) =>
              setArticle(event.target.value as DutchArticle)
            }
          >
            {Object.entries(dutchArticleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dutch text
          <input
            value={rawText}
            disabled={completed}
            onChange={(event) => setRawText(event.target.value)}
          />
        </label>
        <label className={styles.meaningField}>
          My Language meaning
          <input
            value={meaning}
            disabled={completed}
            onChange={(event) => setMeaning(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.preview}>
        <span>Card preview</span>
        <strong>{meaning || 'Meaning needed'}</strong>
        <span>→ {formatDutchText(article, rawText)}</span>
      </div>

      {error ? (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      ) : null}

      {!completed ? (
        <div className={styles.candidateActions}>
          <button
            type="button"
            disabled={isWorking}
            onClick={() =>
              void perform(saveCurrent)
            }
          >
            Save edits
          </button>
          {candidate.status !== 'approved' ? (
            <button
              className={styles.approveButton}
              type="button"
              disabled={isWorking}
              onClick={() =>
                void perform(async () => {
                  await saveCurrent()
                  return setCandidateStatus(candidate.id, 'approved')
                })
              }
            >
              Approve
            </button>
          ) : (
            <button
              className={styles.convertButton}
              type="button"
              disabled={isWorking}
              onClick={() =>
                void perform(async () => {
                  await saveCurrent()
                  return convertCandidateToCard(candidate.id)
                })
              }
            >
              Create card
            </button>
          )}
          <button
            type="button"
            disabled={isWorking}
            onClick={() =>
              void perform(async () => {
                await saveCurrent()
                return markCandidateKnown(candidate.id)
              })
            }
          >
            Mark as known
          </button>
          <button
            className={styles.rejectButton}
            type="button"
            disabled={isWorking}
            onClick={() =>
              void perform(() => setCandidateStatus(candidate.id, 'rejected'))
            }
          >
            Reject
          </button>
        </div>
      ) : (
        <p className={styles.completedMessage}>
          {candidate.status === 'converted'
            ? 'Card created with an initial review state.'
            : candidate.status === 'known'
              ? 'Saved to known words.'
              : 'Candidate rejected.'}
        </p>
      )}
    </article>
  )
}

function formatStatus(status: VocabularyCandidate['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDuplicateStatus(status: CandidateDuplicateStatus): string {
  const labels: Record<CandidateDuplicateStatus, string> = {
    unique: 'No duplicate found',
    duplicateInDeck: 'Already in this deck',
    possibleDuplicate: 'Possible duplicate in another deck',
    duplicateCandidate: 'Repeated candidate in this lesson',
    known: 'Known word',
  }
  return labels[status]
}

function duplicateClass(status: CandidateDuplicateStatus): string {
  return status === 'unique' ? styles.uniquePill : styles.warningPill
}
