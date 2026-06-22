import type {
  AudioProvider,
  AudioVoice,
  SpeakOptions,
} from './audioProvider'

function toAudioVoice(voice: SpeechSynthesisVoice): AudioVoice {
  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
    default: voice.default,
  }
}

export class BrowserSpeechAudioProvider implements AudioProvider {
  isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window
    )
  }

  getVoices(): AudioVoice[] {
    if (!this.isAvailable()) {
      return []
    }

    return window.speechSynthesis.getVoices().map(toAudioVoice)
  }

  speak({ text, voiceURI, rate }: SpeakOptions): Promise<void> {
    if (!this.isAvailable()) {
      return Promise.reject(
        new Error('Speech synthesis is not available in this browser.'),
      )
    }

    const voice = window.speechSynthesis
      .getVoices()
      .find((candidate) => candidate.voiceURI === voiceURI)

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = voice?.lang ?? 'nl-NL'
      utterance.rate = rate
      utterance.voice = voice ?? null
      utterance.onend = () => resolve()
      utterance.onerror = (event) => {
        if (event.error === 'canceled' || event.error === 'interrupted') {
          resolve()
          return
        }

        reject(new Error(`Dutch audio failed: ${event.error}.`))
      }

      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    })
  }

  cancel(): void {
    if (this.isAvailable()) {
      window.speechSynthesis.cancel()
    }
  }

  subscribeToVoiceChanges(listener: () => void): () => void {
    if (!this.isAvailable()) {
      return () => undefined
    }

    window.speechSynthesis.addEventListener('voiceschanged', listener)
    return () =>
      window.speechSynthesis.removeEventListener('voiceschanged', listener)
  }
}
