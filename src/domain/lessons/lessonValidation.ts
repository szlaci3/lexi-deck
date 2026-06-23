import type {
  CreateLessonInput,
  UpdateLessonInput,
} from './lessonTypes'

export type LessonValidationErrors = Partial<
  Record<keyof CreateLessonInput, string>
>

export type LessonValidationResult =
  | { valid: true; value: CreateLessonInput }
  | { valid: false; errors: LessonValidationErrors }

export function validateLessonInput(
  input: CreateLessonInput | UpdateLessonInput,
): LessonValidationResult {
  const value: CreateLessonInput = {
    title: input.title?.trim() ?? '',
    description: input.description?.trim() ?? '',
  }
  const errors: LessonValidationErrors = {}

  if (!value.title) {
    errors.title = 'Enter a lesson title.'
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, value }
}
