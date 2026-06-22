import { describe, expect, it } from 'vitest'
import type { AudioVoice } from './audioProvider'
import { listDutchVoices, selectDutchVoice } from './voiceSelection'

function voice(
  voiceURI: string,
  lang: string,
  name = voiceURI,
): AudioVoice {
  return { voiceURI, lang, name, localService: true, default: false }
}

describe('Dutch voice selection', () => {
  const voices = [
    voice('english', 'en-US'),
    voice('generic-dutch', 'nl'),
    voice('netherlands', 'nl-NL'),
    voice('belgian', 'nl-BE'),
  ]

  it('prefers Belgian Dutch, then Netherlands Dutch, then any Dutch voice', () => {
    expect(listDutchVoices(voices).map((item) => item.voiceURI)).toEqual([
      'belgian',
      'netherlands',
      'generic-dutch',
    ])
  })

  it('honors a selected Dutch voice', () => {
    expect(selectDutchVoice(voices, 'netherlands')?.voiceURI).toBe(
      'netherlands',
    )
  })

  it('returns undefined when no Dutch voice exists', () => {
    expect(selectDutchVoice([voice('english', 'en-US')])).toBeUndefined()
  })
})
