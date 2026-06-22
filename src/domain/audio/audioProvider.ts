export type AudioVoice = {
  voiceURI: string
  name: string
  lang: string
  localService: boolean
  default: boolean
}

export type SpeakOptions = {
  text: string
  voiceURI?: string
  rate: number
}

export interface AudioProvider {
  isAvailable(): boolean
  getVoices(): AudioVoice[]
  speak(options: SpeakOptions): Promise<void>
  cancel(): void
  subscribeToVoiceChanges(listener: () => void): () => void
}
