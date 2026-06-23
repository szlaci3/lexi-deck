import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { extractCandidatesFromOcrText } from '../../db/repositories/candidateRepository'
import { getDeckById } from '../../db/repositories/deckRepository'
import { getLessonById } from '../../db/repositories/lessonRepository'
import {
  getOcrTextBySourceImageId,
  runOcrForSourceImage,
  updateOcrText,
} from '../../db/repositories/ocrRepository'
import { getSourceImageById } from '../../db/repositories/sourceImageRepository'
import type { Deck } from '../../domain/decks/deckTypes'
import type { Lesson } from '../../domain/lessons/lessonTypes'
import type { SourceImage } from '../../domain/media/mediaTypes'
import type { OcrText } from '../../domain/ocr/ocrTypes'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import styles from './OcrReviewScreen.module.css'

type OcrPageData = {
  deck: Deck
  lesson: Lesson
  sourceImage: SourceImage
  ocrText?: OcrText
}

type ProgressState = {
  status: string
  progress: number
}

export function OcrReviewScreen() {
  const { deckId, lessonId, sourceImageId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<OcrPageData>()
  const [draftText, setDraftText] = useState('')
  const [ocrProgress, setOcrProgress] = useState<ProgressState>()
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!deckId || !lessonId || !sourceImageId) return

    let isActive = true
    Promise.all([
      getDeckById(deckId),
      getLessonById(lessonId),
      getSourceImageById(sourceImageId),
      getOcrTextBySourceImageId(sourceImageId),
    ])
      .then(([deck, lesson, sourceImage, ocrText]) => {
        if (!isActive) return

        if (
          !deck ||
          deck.archivedAt ||
          !lesson ||
          lesson.archivedAt ||
          lesson.deckId !== deckId ||
          !sourceImage ||
          sourceImage.archivedAt ||
          sourceImage.deckId !== deckId ||
          sourceImage.lessonId !== lessonId
        ) {
          setData(undefined)
          setError('This source image was not found in the selected lesson.')
          return
        }

        setData({ deck, lesson, sourceImage, ocrText })
        setDraftText(ocrText?.rawText ?? '')
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'The OCR review could not be loaded.',
          )
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [deckId, lessonId, sourceImageId])

  async function runOcr() {
    if (!data) return

    setIsRunning(true)
    setMessage('')
    setError('')
    setOcrProgress({ status: 'Starting Dutch OCR', progress: 0 })
    setData((current) =>
      current
        ? {
            ...current,
            sourceImage: { ...current.sourceImage, ocrStatus: 'pending' },
          }
        : current,
    )

    try {
      const ocrText = await runOcrForSourceImage(
        data.sourceImage.id,
        setOcrProgress,
      )
      setDraftText(ocrText.rawText)
      setData((current) =>
        current
          ? {
              ...current,
              ocrText,
              sourceImage: { ...current.sourceImage, ocrStatus: 'complete' },
            }
          : current,
      )
      setMessage('Dutch OCR text is ready. Correct it before creating drafts.')
    } catch (runError: unknown) {
      setData((current) =>
        current
          ? {
              ...current,
              sourceImage: { ...current.sourceImage, ocrStatus: 'failed' },
            }
          : current,
      )
      setError(
        runError instanceof Error
          ? runError.message
          : 'Dutch OCR could not read this image.',
      )
    } finally {
      setIsRunning(false)
      setOcrProgress(undefined)
    }
  }

  async function saveText(): Promise<OcrText | undefined> {
    if (!data) return undefined

    setIsSaving(true)
    setMessage('')
    setError('')
    try {
      const ocrText = await updateOcrText(data.sourceImage.id, draftText)
      setDraftText(ocrText.rawText)
      setData((current) => (current ? { ...current, ocrText } : current))
      setMessage('Reviewed OCR text saved.')
      return ocrText
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'The reviewed OCR text could not be saved.',
      )
      return undefined
    } finally {
      setIsSaving(false)
    }
  }

  async function saveAndReviewDrafts() {
    if (!data) return

    setIsSaving(true)
    setMessage('')
    setError('')
    try {
      const ocrText = await updateOcrText(data.sourceImage.id, draftText)
      setDraftText(ocrText.rawText)
      setData((current) => (current ? { ...current, ocrText } : current))
      await extractCandidatesFromOcrText(ocrText.id)
      navigate(
        `/decks/${data.deck.id}/lessons/${data.lesson.id}/images/${data.sourceImage.id}/candidates`,
      )
    } catch (draftError: unknown) {
      setError(
        draftError instanceof Error
          ? draftError.message
          : 'Draft cards could not be created from the reviewed text.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (!deckId || !lessonId || !sourceImageId) {
    return (
      <section className={styles.errorState} role="alert">
        <p className={styles.eyebrow}>OCR unavailable</p>
        <h1>This OCR review address is invalid.</h1>
        <Link to="/">Back to decks</Link>
      </section>
    )
  }

  if (isLoading) {
    return <p className={styles.status}>Loading OCR review…</p>
  }

  if (error && !data) {
    return (
      <section className={styles.errorState} role="alert">
        <p className={styles.eyebrow}>OCR unavailable</p>
        <h1>We could not open this source image.</h1>
        <p>{error}</p>
        <Link to={`/decks/${deckId}/lessons/${lessonId}`}>
          Back to lesson
        </Link>
      </section>
    )
  }

  if (!data) return null

  const { deck, lesson, sourceImage, ocrText } = data

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/">Decks</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/decks/${deck.id}`}>{deck.name}</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/decks/${deck.id}/lessons/${lesson.id}`}>
          {lesson.title}
        </Link>
        <span aria-hidden="true">/</span>
        <span>OCR review</span>
      </nav>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Dutch OCR</p>
          <h1>Review extracted text</h1>
          <p>
            Text is read from this image in your browser. Correct the result
            before LexiDeck proposes draft cards.
          </p>
        </div>
        <span className={styles.statusBadge}>
          {formatOcrStatus(sourceImage.ocrStatus)}
        </span>
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

      <div className={styles.workspace}>
        <SourceImagePanel image={sourceImage} />

        <section className={styles.textPanel}>
          <div>
            <p className={styles.eyebrow}>Extracted content</p>
            <h2>{ocrText ? 'Editable OCR text' : 'Run Dutch OCR'}</h2>
          </div>

          {ocrText ? (
            <>
              <label className={styles.textField}>
                Reviewed OCR text
                <textarea
                  value={draftText}
                  rows={18}
                  onChange={(event) => setDraftText(event.target.value)}
                />
              </label>
              <div className={styles.textMeta}>
                <span>Provider: {formatProvider(ocrText.provider)}</span>
                <span>Confidence: {formatConfidence(ocrText.confidence)}</span>
                <span>
                  Updated: {new Date(ocrText.updatedAt).toLocaleString()}
                </span>
              </div>
              <div className={styles.actionRow}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  disabled={isSaving || !draftText.trim()}
                  onClick={() => void saveText()}
                >
                  {isSaving ? 'Saving…' : 'Save reviewed text'}
                </button>
                <button
                  className={styles.candidateButton}
                  type="button"
                  disabled={isSaving || !draftText.trim()}
                  onClick={() => void saveAndReviewDrafts()}
                >
                  Save and review draft cards
                </button>
              </div>
            </>
          ) : (
            <p className={styles.intro}>
              OCR uses the Dutch language model and the actual optimized image.
              Processing happens locally; no image is sent to an OCR service.
            </p>
          )}

          <div className={styles.rerunArea}>
            {ocrProgress ? (
              <div className={styles.progressArea} role="status">
                <div>
                  <span>{ocrProgress.status}</span>
                  <strong>{Math.round(ocrProgress.progress * 100)}%</strong>
                </div>
                <progress max="1" value={ocrProgress.progress} />
              </div>
            ) : null}
            <small>
              OCR may take a while on mobile devices. Existing reviewed text is
              kept if a rerun fails.
            </small>
            <button
              className={
                ocrText ? styles.secondaryButton : styles.primaryButton
              }
              type="button"
              disabled={isRunning}
              onClick={() => void runOcr()}
            >
              {isRunning
                ? 'Reading image…'
                : ocrText
                  ? 'Run Dutch OCR again'
                  : 'Run Dutch OCR'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function SourceImagePanel({ image }: { image: SourceImage }) {
  const url = useBlobUrl(image.blob)

  return (
    <section className={styles.imagePanel}>
      <div>
        <p className={styles.eyebrow}>Source image</p>
        <h2>{image.fileName}</h2>
      </div>
      <img src={url} alt={`Textbook page ${image.fileName}`} />
      <p>
        {image.width} × {image.height}
      </p>
    </section>
  )
}

function formatOcrStatus(status: SourceImage['ocrStatus']): string {
  const labels: Record<SourceImage['ocrStatus'], string> = {
    notStarted: 'Not started',
    pending: 'Pending',
    complete: 'Complete',
    failed: 'Failed',
  }
  return labels[status]
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

function formatProvider(provider: OcrText['provider']): string {
  return provider === 'tesseract' ? 'Tesseract.js (Dutch)' : 'Legacy mock OCR'
}
