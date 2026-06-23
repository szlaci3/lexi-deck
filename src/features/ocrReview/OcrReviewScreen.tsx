import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import { MOCK_OCR_DEMO_TEXT } from '../../domain/ocr/mockOcrProvider'
import type { OcrText } from '../../domain/ocr/ocrTypes'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import styles from './OcrReviewScreen.module.css'

type OcrPageData = {
  deck: Deck
  lesson: Lesson
  sourceImage: SourceImage
  ocrText?: OcrText
}

export function OcrReviewScreen() {
  const { deckId, lessonId, sourceImageId } = useParams()
  const [data, setData] = useState<OcrPageData>()
  const [draftText, setDraftText] = useState('')
  const [testText, setTestText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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
      .then(([deck, lesson, sourceImage, ocrText]) => {
        if (!isActive) {
          return
        }

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
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [deckId, lessonId, sourceImageId])

  async function runOcr() {
    if (!data) {
      return
    }

    setIsRunning(true)
    setMessage('')
    setError('')
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
        testText || undefined,
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
      setMessage('Mock OCR text is ready for review.')
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
          : 'Mock OCR could not be completed.',
      )
    } finally {
      setIsRunning(false)
    }
  }

  async function saveText() {
    if (!data) {
      return
    }

    setIsSaving(true)
    setMessage('')
    setError('')
    try {
      const ocrText = await updateOcrText(data.sourceImage.id, draftText)
      setDraftText(ocrText.rawText)
      setData((current) => (current ? { ...current, ocrText } : current))
      setMessage('Corrected OCR text saved.')
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'The OCR text could not be saved.',
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
        <Link to={lessonId && deckId ? `/decks/${deckId}/lessons/${lessonId}` : '/'}>
          Back to lesson
        </Link>
      </section>
    )
  }

  if (!data) {
    return null
  }

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
          <p className={styles.eyebrow}>Mock OCR</p>
          <h1>Review extracted text</h1>
          <p>
            Run deterministic mock OCR, compare its text with the page, and
            correct anything before candidate extraction.
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
            <h2>{ocrText ? 'OCR text' : 'Run mock OCR'}</h2>
          </div>

          {ocrText ? (
            <>
              <label className={styles.textField}>
                Corrected OCR text
                <textarea
                  value={draftText}
                  rows={18}
                  onChange={(event) => setDraftText(event.target.value)}
                />
              </label>
              <div className={styles.textMeta}>
                <span>Provider: Mock OCR</span>
                <span>Confidence: {formatConfidence(ocrText.confidence)}</span>
                <span>
                  Updated: {new Date(ocrText.updatedAt).toLocaleString()}
                </span>
              </div>
              <button
                className={styles.primaryButton}
                type="button"
                disabled={isSaving || !draftText.trim()}
                onClick={() => void saveText()}
              >
                {isSaving ? 'Saving…' : 'Save corrected text'}
              </button>
            </>
          ) : (
            <p className={styles.intro}>
              The mock provider uses stable demo text unless you supply custom
              test text below. It does not inspect the image or contact a
              remote service.
            </p>
          )}

          <div className={styles.rerunArea}>
            <label className={styles.textField}>
              Mock test text (optional)
              <textarea
                value={testText}
                rows={6}
                placeholder={MOCK_OCR_DEMO_TEXT}
                onChange={(event) => setTestText(event.target.value)}
              />
            </label>
            <small>
              Leave this empty to use LexiDeck’s deterministic demo result.
            </small>
            <button
              className={ocrText ? styles.secondaryButton : styles.primaryButton}
              type="button"
              disabled={isRunning}
              onClick={() => void runOcr()}
            >
              {isRunning
                ? 'Running mock OCR…'
                : ocrText
                  ? 'Run mock OCR again'
                  : 'Run mock OCR'}
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
