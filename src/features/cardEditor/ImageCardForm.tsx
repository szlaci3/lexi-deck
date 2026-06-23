import { useState, type FormEvent } from 'react'
import type { Deck } from '../../domain/decks/deckTypes'
import type { SourceImage } from '../../domain/media/mediaTypes'
import {
  dutchArticleLabels,
  type CreateImageCardInput,
  type DutchArticle,
} from '../../domain/cards/cardTypes'
import { formatDutchText } from '../../domain/cards/cardDisplay'
import { validateImageCardInput } from '../../domain/cards/cardValidation'
import { myLanguageLabels } from '../../domain/decks/deckTypes'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import styles from './ImageCardForm.module.css'

type ImageCardFormProps = {
  deck: Deck
  image: SourceImage
  onCancel: () => void
  onSubmit: (input: CreateImageCardInput) => Promise<void>
}

export function ImageCardForm({
  deck,
  image,
  onCancel,
  onSubmit,
}: ImageCardFormProps) {
  const imageUrl = useBlobUrl(image.blob)
  const [backDutch, setBackDutch] = useState('')
  const [backMyLanguage, setBackMyLanguage] = useState('')
  const [article, setArticle] = useState<DutchArticle>('unknown')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: CreateImageCardInput = {
      deckId: deck.id,
      lessonId: image.lessonId,
      frontImageId: image.id,
      backDutch,
      backMyLanguage,
      article,
      notes,
    }
    const result = validateImageCardInput(input)
    if (!result.valid) {
      setError(
        Object.values(result.errors)[0] ?? 'Complete the required card fields.',
      )
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(input)
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'The image card could not be created.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.heading}>
        <div>
          <p>New image card</p>
          <h2>Image → Dutch</h2>
        </div>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className={styles.imagePreview}>
        <img src={imageUrl} alt={`Card prompt from ${image.fileName}`} />
        <span>{image.fileName}</span>
      </div>

      <div className={styles.dutchFields}>
        <label>
          Article
          <select
            value={article}
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
          Dutch answer
          <input
            value={backDutch}
            placeholder="komkommer"
            onChange={(event) => setBackDutch(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.preview}>
        <span>Dutch preview</span>
        <strong>{formatDutchText(article, backDutch) || 'Dutch answer'}</strong>
      </div>

      <label>
        {myLanguageLabels[deck.myLanguage]} meaning (optional)
        <input
          value={backMyLanguage}
          onChange={(event) => setBackMyLanguage(event.target.value)}
        />
      </label>

      <label>
        Notes (optional)
        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating…' : 'Create image card'}
        </button>
      </div>
    </form>
  )
}
