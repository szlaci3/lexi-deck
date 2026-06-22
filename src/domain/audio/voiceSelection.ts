import type { AudioVoice } from './audioProvider'

export function isDutchVoice(voice: AudioVoice): boolean {
  return voice.lang.toLocaleLowerCase().startsWith('nl')
}

export function rankDutchVoice(voice: AudioVoice): number {
  const lang = voice.lang.toLocaleLowerCase()
  const name = voice.name.toLocaleLowerCase()

  if (
    lang === 'nl-be' ||
    name.includes('flemish') ||
    name.includes('vlaams')
  ) {
    return 0
  }

  if (lang === 'nl-nl') {
    return 1
  }

  return isDutchVoice(voice) ? 2 : 3
}

export function listDutchVoices(voices: AudioVoice[]): AudioVoice[] {
  return voices
    .filter(isDutchVoice)
    .sort(
      (left, right) =>
        rankDutchVoice(left) - rankDutchVoice(right) ||
        Number(right.default) - Number(left.default) ||
        left.name.localeCompare(right.name),
    )
}

export function selectDutchVoice(
  voices: AudioVoice[],
  preferredVoiceURI?: string,
): AudioVoice | undefined {
  const dutchVoices = listDutchVoices(voices)
  const preferredVoice = dutchVoices.find(
    (voice) => voice.voiceURI === preferredVoiceURI,
  )

  return preferredVoice ?? dutchVoices[0]
}
