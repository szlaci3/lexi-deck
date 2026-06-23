import type {
  CreateDeckInput,
  MyLanguage,
  UpdateDeckInput,
} from './deckTypes'

export type DeckValidationErrors = Partial<
  Record<keyof CreateDeckInput, string>
>

export type DeckValidationResult =
  | { valid: true; value: CreateDeckInput }
  | { valid: false; errors: DeckValidationErrors }

const myLanguages: readonly MyLanguage[] = ['en', 'zh-Hans']

export function isMyLanguage(value: string): value is MyLanguage {
  return myLanguages.some((language) => language === value)
}

export function validateDeckInput(
  input: CreateDeckInput | UpdateDeckInput,
): DeckValidationResult {
  const value: CreateDeckInput = {
    name: input.name?.trim() ?? '',
    description: input.description?.trim() ?? '',
    myLanguage: input.myLanguage ?? 'en',
  }
  const errors: DeckValidationErrors = {}

  if (!value.name) {
    errors.name = 'Enter a deck name.'
  }

  if (!value.description) {
    errors.description = 'Enter a short description.'
  }

  if (!isMyLanguage(value.myLanguage)) {
    errors.myLanguage = 'Choose English or Chinese.'
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, value }
}
