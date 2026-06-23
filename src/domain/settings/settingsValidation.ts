import type { SettingsInput } from './settingsTypes'

export type SettingsValidationResult =
  | { valid: true; value: SettingsInput }
  | { valid: false; error: string }

export function validateSettings(
  input: SettingsInput,
): SettingsValidationResult {
  if (
    !Number.isFinite(input.speechRate) ||
    input.speechRate < 0.5 ||
    input.speechRate > 1.5
  ) {
    return {
      valid: false,
      error: 'Speech rate must be between 0.5 and 1.5.',
    }
  }

  if (!isValidLimit(input.dailyNewCardLimit, 0, 500)) {
    return {
      valid: false,
      error: 'Daily new card limit must be a whole number from 0 to 500.',
    }
  }

  if (!isValidLimit(input.dailyReviewLimit, 0, 5000)) {
    return {
      valid: false,
      error: 'Daily review limit must be a whole number from 0 to 5000.',
    }
  }

  return {
    valid: true,
    value: {
      autoPlayAudio: input.autoPlayAudio,
      preferredVoiceURI: input.preferredVoiceURI || undefined,
      speechRate: input.speechRate,
      dailyNewCardLimit: input.dailyNewCardLimit,
      dailyReviewLimit: input.dailyReviewLimit,
    },
  }
}

function isValidLimit(
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  return (
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  )
}
