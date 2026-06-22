import type { Card } from '../cards/cardTypes'
import type { AppSettings } from '../settings/settingsTypes'
import type { AudioProvider, AudioVoice } from './audioProvider'
import { getDutchAudioText } from './audioText'
import { BrowserSpeechAudioProvider } from './browserSpeechAudioProvider'
import { listDutchVoices, selectDutchVoice } from './voiceSelection'

const provider: AudioProvider = new BrowserSpeechAudioProvider()

export type AudioAvailability = {
  supported: boolean
  voices: AudioVoice[]
}

export function getAudioAvailability(): AudioAvailability {
  return {
    supported: provider.isAvailable(),
    voices: listDutchVoices(provider.getVoices()),
  }
}

export function subscribeToVoiceChanges(listener: () => void): () => void {
  return provider.subscribeToVoiceChanges(listener)
}

export async function playDutchCardAudio(
  card: Pick<Card, 'article' | 'backDutch'>,
  settings: Pick<AppSettings, 'preferredVoiceURI' | 'speechRate'>,
): Promise<void> {
  if (!provider.isAvailable()) {
    throw new Error('Speech synthesis is not available in this browser.')
  }

  const voice = selectDutchVoice(
    provider.getVoices(),
    settings.preferredVoiceURI,
  )

  if (!voice) {
    throw new Error('No Dutch voice is installed in this browser.')
  }

  await provider.speak({
    text: getDutchAudioText(card),
    voiceURI: voice.voiceURI,
    rate: settings.speechRate,
  })
}

export function stopDutchAudio(): void {
  provider.cancel()
}
