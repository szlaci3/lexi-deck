export type AppSettings = {
  id: string
  autoPlayAudio: boolean
  preferredVoiceURI?: string
  speechRate: number
  dailyNewCardLimit: number
  dailyReviewLimit: number
  createdAt: string
  updatedAt: string
}

export type SettingsInput = Pick<
  AppSettings,
  | 'autoPlayAudio'
  | 'preferredVoiceURI'
  | 'speechRate'
  | 'dailyNewCardLimit'
  | 'dailyReviewLimit'
>
