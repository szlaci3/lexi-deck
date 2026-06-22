import { useState, type FormEvent } from 'react'
import {
  myLanguageLabels,
  type CreateDeckInput,
  type Deck,
  type MyLanguage,
} from '../../domain/decks/deckTypes'
import {
  validateDeckInput,
  type DeckValidationErrors,
} from '../../domain/decks/deckValidation'
import styles from './DeckForm.module.css'

type DeckFormProps = {
  deck?: Deck
  isLanguageLocked?: boolean
  onCancel: () => void
  onSubmit: (input: CreateDeckInput) => Promise<void>
}

export function DeckForm({
  deck,
  isLanguageLocked = false,
  onCancel,
  onSubmit,
}: DeckFormProps) {
  const [name, setName] = useState(deck?.name ?? '')
  const [description, setDescription] = useState(deck?.description ?? '')
  const [myLanguage, setMyLanguage] = useState<MyLanguage>(
    deck?.myLanguage ?? 'en',
  )
  const [errors, setErrors] = useState<DeckValidationErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateDeckInput({ name, description, myLanguage })

    if (!result.valid) {
      setErrors(result.errors)
      return
    }

    setErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      await onSubmit(result.value)
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : 'The deck could not be saved.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{deck ? 'Edit deck' : 'New deck'}</p>
          <h2>{deck ? 'Update this deck' : 'Create a study deck'}</h2>
        </div>
        <button className={styles.closeButton} type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <label className={styles.field}>
        <span>Deck name</span>
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'deck-name-error' : undefined}
          placeholder="Nederlands Breakthrough A1"
        />
        {errors.name ? (
          <small id="deck-name-error" className={styles.error}>
            {errors.name}
          </small>
        ) : null}
      </label>

      <label className={styles.field}>
        <span>Description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? 'deck-description-error' : undefined
          }
          placeholder="Vocabulary from my Dutch course"
        />
        {errors.description ? (
          <small id="deck-description-error" className={styles.error}>
            {errors.description}
          </small>
        ) : null}
      </label>

      <label className={styles.field}>
        <span>My Language</span>
        <select
          value={myLanguage}
          disabled={isLanguageLocked}
          onChange={(event) =>
            setMyLanguage(event.target.value as MyLanguage)
          }
        >
          {Object.entries(myLanguageLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <small className={styles.hint}>
          {isLanguageLocked
            ? 'My Language is locked because this deck contains cards.'
            : 'This is the prompt language shown on your cards.'}
        </small>
      </label>

      {submitError ? (
        <p className={styles.submitError} role="alert">
          {submitError}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : deck ? 'Save changes' : 'Create deck'}
        </button>
      </div>
    </form>
  )
}
