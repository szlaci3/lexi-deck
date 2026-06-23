import { describe, expect, it } from 'vitest'
import { validateSettings } from './settingsValidation'

const defaults = {
  autoPlayAudio: true,
  preferredVoiceURI: undefined,
  speechRate: 1,
  dailyNewCardLimit: 20,
  dailyReviewLimit: 200,
}

describe('validateSettings', () => {
  it('accepts the default study and audio settings', () => {
    expect(validateSettings(defaults)).toEqual({
      valid: true,
      value: defaults,
    })
  })

  it('rejects speech rates outside the supported range', () => {
    expect(validateSettings({ ...defaults, speechRate: 2 })).toEqual({
      valid: false,
      error: 'Speech rate must be between 0.5 and 1.5.',
    })
  })

  it('rejects invalid daily limits', () => {
    expect(
      validateSettings({ ...defaults, dailyNewCardLimit: 1.5 }),
    ).toEqual({
      valid: false,
      error: 'Daily new card limit must be a whole number from 0 to 500.',
    })
    expect(
      validateSettings({ ...defaults, dailyReviewLimit: -1 }),
    ).toEqual({
      valid: false,
      error: 'Daily review limit must be a whole number from 0 to 5000.',
    })
  })
})
