export const databaseSchemaV1 = {
  decks: 'id, name, myLanguage, targetLanguage, createdAt, updatedAt, archivedAt',
  lessons: 'id, deckId, [deckId+order], title, archivedAt',
  cards:
    'id, deckId, lessonId, [deckId+lessonId], backDutch, suspendedAt, archivedAt',
  reviewStates: 'id, &cardId, dueAt',
  reviewLogs: 'id, cardId, reviewedAt, [cardId+reviewedAt]',
  settings: 'id',
  knownWords: 'id, normalizedText, article',
} as const

export const databaseSchemaV2 = {
  ...databaseSchemaV1,
  sourceImages:
    'id, deckId, lessonId, [deckId+lessonId], createdAt, ocrStatus, archivedAt',
} as const

export const databaseSchemaV3 = {
  ...databaseSchemaV2,
  ocrTexts: 'id, &sourceImageId, provider, updatedAt',
} as const

export const databaseSchemaV4 = {
  ...databaseSchemaV3,
  vocabularyCandidates:
    'id, deckId, lessonId, sourceImageId, ocrTextId, [lessonId+status], normalizedText, duplicateStatus, updatedAt',
} as const
