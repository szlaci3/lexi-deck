import type {
  CreateCardInput,
  DutchArticle,
  UpdateCardInput,
} from './cardTypes'
import { stripSelectedArticle } from './cardDisplay'

export type EditableCardInput = Omit<CreateCardInput, 'deckId'>

export type CardValidationErrors = Partial<
  Record<keyof EditableCardInput, string>
>

export type CardValidationResult =
  | { valid: true; value: EditableCardInput }
  | { valid: false; errors: CardValidationErrors }

const articles: readonly DutchArticle[] = ['de', 'het', 'none', 'unknown']

export function isDutchArticle(value: string): value is DutchArticle {
  return articles.some((article) => article === value)
}

export function validateCardInput(
  input: EditableCardInput | UpdateCardInput,
): CardValidationResult {
  const value: EditableCardInput = {
    lessonId: input.lessonId?.trim() ?? '',
    frontText: input.frontText?.trim() ?? '',
    backDutch: stripSelectedArticle(
      input.article ?? 'unknown',
      input.backDutch ?? '',
    ),
    article: input.article ?? 'unknown',
    notes: input.notes?.trim() ?? '',
  }
  const errors: CardValidationErrors = {}

  if (!value.lessonId) {
    errors.lessonId = 'Choose a lesson.'
  }

  if (!value.frontText) {
    errors.frontText = 'Enter the prompt text.'
  }

  if (!value.backDutch) {
    errors.backDutch = 'Enter the Dutch answer.'
  }

  if (!isDutchArticle(value.article)) {
    errors.article = 'Choose a valid article.'
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, value }
}
