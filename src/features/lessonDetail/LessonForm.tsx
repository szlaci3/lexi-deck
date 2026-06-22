import { useState, type FormEvent } from 'react'
import type {
  CreateLessonInput,
  Lesson,
} from '../../domain/lessons/lessonTypes'
import {
  validateLessonInput,
  type LessonValidationErrors,
} from '../../domain/lessons/lessonValidation'
import styles from './LessonForm.module.css'

type LessonFormProps = {
  lesson?: Lesson
  onCancel: () => void
  onSubmit: (input: CreateLessonInput) => Promise<void>
}

export function LessonForm({
  lesson,
  onCancel,
  onSubmit,
}: LessonFormProps) {
  const [title, setTitle] = useState(lesson?.title ?? '')
  const [description, setDescription] = useState(lesson?.description ?? '')
  const [errors, setErrors] = useState<LessonValidationErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateLessonInput({ title, description })

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
        error instanceof Error
          ? error.message
          : 'The lesson could not be saved.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.heading}>
        <div>
          <p>{lesson ? 'Edit lesson' : 'New lesson'}</p>
          <h2>{lesson ? 'Update this lesson' : 'Add a lesson'}</h2>
        </div>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <label className={styles.field}>
        <span>Lesson title</span>
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'lesson-title-error' : undefined}
          placeholder="Lesson 1 — Kennismaken"
        />
        {errors.title ? (
          <small id="lesson-title-error" className={styles.error}>
            {errors.title}
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
            errors.description ? 'lesson-description-error' : undefined
          }
          placeholder="Introductions, greetings, and basic questions"
        />
        {errors.description ? (
          <small id="lesson-description-error" className={styles.error}>
            {errors.description}
          </small>
        ) : null}
      </label>

      {submitError ? (
        <p className={styles.submitError} role="alert">
          {submitError}
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
          {isSubmitting
            ? 'Saving…'
            : lesson
              ? 'Save changes'
              : 'Create lesson'}
        </button>
      </div>
    </form>
  )
}
