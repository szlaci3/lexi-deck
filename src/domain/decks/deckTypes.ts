export type MyLanguage = 'en' | 'zh-Hans'
export type TargetLanguage = 'nl'

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
