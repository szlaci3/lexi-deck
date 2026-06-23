export type MyLanguage = 'en' | 'zh-Hans'
export type TargetLanguage = 'nl'

export const myLanguageLabels: Record<MyLanguage, string> = {
  en: 'English',
  'zh-Hans': 'Chinese',
}

export const targetLanguageLabels: Record<TargetLanguage, string> = {
  nl: 'Dutch',
}

export type Deck = {
  id: string
  name: string
  description: string
  myLanguage: MyLanguage
  targetLanguage: TargetLanguage
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export type CreateDeckInput = Pick<Deck, 'name' | 'description' | 'myLanguage'>
export type UpdateDeckInput = Partial<CreateDeckInput>

export type DeckSummary = {
  deck: Deck
  lessonCount: number
  cardCount: number
  dueCount: number
}
