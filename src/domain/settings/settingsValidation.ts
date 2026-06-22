import type { AudioSettingsInput } from './settingsTypes'

export type SettingsValidationResult =
  | { valid: true; value: AudioSettingsInput }
  | { valid: false; error: string }

export function validateAudioSettings(
  input: AudioSettingsInput,
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

  return {
    valid: true,
    value: {
      autoPlayAudio: input.autoPlayAudio,
      preferredVoiceURI: input.preferredVoiceURI || undefined,
      speechRate: input.speechRate,
    },
  }
}
