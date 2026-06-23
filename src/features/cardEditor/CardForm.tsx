import { useRef, useState, type FormEvent } from 'react'
import type { Deck } from '../../domain/decks/deckTypes'
import { myLanguageLabels } from '../../domain/decks/deckTypes'
import type { Lesson } from '../../domain/lessons/lessonTypes'
import {
  dutchArticleLabels,
  type Card,
  type CreateCardInput,
  type DutchArticle,
  type UpdateCardInput,
} from '../../domain/cards/cardTypes'
import {
  validateCardInput,
  type CardValidationErrors,
} from '../../domain/cards/cardValidation'
import { formatDutchText } from '../../domain/cards/cardDisplay'
import type { DuplicateDetectionResult } from '../../domain/duplicates/duplicateDetection'
import styles from './CardForm.module.css'

type CardFormProps = {
  deck: Deck
  lessons: Lesson[]
  card?: Card
  initialLessonId?: string
  onCancel: () => void
  onCheckDuplicates: (
    input: CreateCardInput,
    excludeCardId?: string,
  ) => Promise<DuplicateDetectionResult>
  onSubmit: (input: UpdateCardInput) => Promise<void>
}

export function CardForm({
  deck,
  lessons,
  card,
  initialLessonId,
  onCancel,
  onCheckDuplicates,
  onSubmit,
}: CardFormProps) {
  const [lessonId, setLessonId] = useState(
    card?.lessonId ?? initialLessonId ?? lessons[0]?.id ?? '',
  )
  const [frontText, setFrontText] = useState(card?.frontText ?? '')
  const [backDutch, setBackDutch] = useState(card?.backDutch ?? '')
  const [article, setArticle] = useState<DutchArticle>(
    card?.article ?? 'unknown',
  )
  const [notes, setNotes] = useState(card?.notes ?? '')
  const [errors, setErrors] = useState<CardValidationErrors>({})
  const [duplicates, setDuplicates] = useState<DuplicateDetectionResult>()
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDuplicateApproved, setIsDuplicateApproved] = useState(false)
  const promptInputRef = useRef<HTMLInputElement>(null)

  function clearDuplicateApproval() {
    setDuplicates(undefined)
    setIsDuplicateApproved(false)
    setSuccessMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateCardInput({
      lessonId,
      frontText,
      backDutch,
      article,
      notes,
    })

    if (!result.valid) {
      setErrors(result.errors)
      return
    }

    setErrors({})
    setSubmitError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      if (!isDuplicateApproved) {
        const duplicateResult = await onCheckDuplicates(
          { deckId: deck.id, ...result.value },
          card?.id,
        )

        if (duplicateResult.status !== 'unique') {
          setDuplicates(duplicateResult)
          setIsSubmitting(false)
          return
        }
      }

      await onSubmit(result.value)
      if (!card) {
        setFrontText('')
        setBackDutch('')
        setArticle('unknown')
        setNotes('')
        setErrors({})
        setDuplicates(undefined)
        setIsDuplicateApproved(false)
        setSuccessMessage('Card saved. Add another card when ready.')
        requestAnimationFrame(() => promptInputRef.current?.focus())
      }
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : 'The card could not be saved.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const promptLabel = `${myLanguageLabels[deck.myLanguage]} prompt`

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.heading}>
        <div>
          <p>{card ? 'Edit card' : 'New card'}</p>
          <h2>{card ? 'Update this card' : 'Create a flashcard'}</h2>
        </div>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <label className={styles.field}>
        <span>Lesson</span>
        <select
          value={lessonId}
          onChange={(event) => {
            setLessonId(event.target.value)
            clearDuplicateApproval()
          }}
          aria-invalid={Boolean(errors.lessonId)}
        >
          <option value="">Choose a lesson</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.order}. {lesson.title}
            </option>
          ))}
        </select>
        {errors.lessonId ? (
          <small className={styles.error}>{errors.lessonId}</small>
        ) : null}
      </label>

      <label className={styles.field}>
        <span>{promptLabel}</span>
        <input
          ref={promptInputRef}
          autoFocus
          value={frontText}
          onChange={(event) => {
            setFrontText(event.target.value)
            clearDuplicateApproval()
          }}
          aria-invalid={Boolean(errors.frontText)}
          placeholder={
            deck.myLanguage === 'en' ? 'cucumber' : '输入简体中文提示'
          }
        />
        {errors.frontText ? (
          <small className={styles.error}>{errors.frontText}</small>
        ) : null}
      </label>

      <div className={styles.dutchFields}>
        <label className={styles.field}>
          <span>Article</span>
          <select
            value={article}
            onChange={(event) => {
              setArticle(event.target.value as DutchArticle)
              clearDuplicateApproval()
            }}
          >
            {Object.entries(dutchArticleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Dutch answer</span>
          <input
            value={backDutch}
            onChange={(event) => {
              setBackDutch(event.target.value)
              clearDuplicateApproval()
            }}
            aria-invalid={Boolean(errors.backDutch)}
            placeholder="komkommer"
          />
          {errors.backDutch ? (
            <small className={styles.error}>{errors.backDutch}</small>
          ) : null}
        </label>
      </div>

      <div className={styles.preview}>
        <span>Dutch preview</span>
        <strong>{formatDutchText(article, backDutch) || 'Dutch answer'}</strong>
      </div>

      <label className={styles.field}>
        <span>Notes (optional)</span>
        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Context, example sentence, or memory aid"
        />
      </label>

      {duplicates ? (
        <div className={styles.duplicateWarning} role="alert">
          <strong>
            {duplicates.status === 'duplicate'
              ? 'Likely duplicate found'
              : 'Possible duplicate found'}
          </strong>
          <p>
            Review the existing {duplicates.matches.length === 1 ? 'card' : 'cards'} before
            saving.
          </p>
          <ul>
            {duplicates.matches.slice(0, 3).map((match) => (
              <li key={match.card.id}>
                <span>{match.card.frontText}</span>
                <strong>
                  {formatDutchText(match.card.article, match.card.backDutch)}
                </strong>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setIsDuplicateApproved(true)}
          >
            Save anyway
          </button>
          {isDuplicateApproved ? (
            <small>Duplicate warning acknowledged. Submit once more to save.</small>
          ) : null}
        </div>
      ) : null}

      {submitError ? (
        <p className={styles.submitError} role="alert">
          {submitError}
        </p>
      ) : null}
      {successMessage ? (
        <p className={styles.successMessage} role="status">
          {successMessage}
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
          {isSubmitting ? 'Saving…' : card ? 'Save changes' : 'Create card'}
        </button>
      </div>
    </form>
  )
}
