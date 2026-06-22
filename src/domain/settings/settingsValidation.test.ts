import { describe, expect, it } from 'vitest'
import { validateAudioSettings } from './settingsValidation'

describe('validateAudioSettings', () => {
  it('accepts the default audio settings', () => {
    expect(
      validateAudioSettings({
        autoPlayAudio: true,
        preferredVoiceURI: undefined,
        speechRate: 1,
      }),
    ).toEqual({
      valid: true,
      value: {
        autoPlayAudio: true,
        preferredVoiceURI: undefined,
        speechRate: 1,
      },
    })
  })

  it('rejects speech rates outside the supported range', () => {
    expect(
      validateAudioSettings({
        autoPlayAudio: true,
        preferredVoiceURI: undefined,
        speechRate: 2,
      }),
    ).toEqual({
      valid: false,
      error: 'Speech rate must be between 0.5 and 1.5.',
    })
  })
})
