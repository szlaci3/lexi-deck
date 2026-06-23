import type { ExportBundleV1 } from './exportTypes'
import { parseJson } from '../../utils/json'

export type ImportValidationResult =
  | { valid: true; bundle: ExportBundleV1 }
  | { valid: false; errors: string[] }

type RecordValue = Record<string, unknown>

const requiredTables = [
  'decks',
  'lessons',
  'cards',
  'reviewStates',
  'reviewLogs',
  'settings',
  'knownWords',
] as const

export function validateImportBundle(
  value: unknown,
): ImportValidationResult {
  const errors: string[] = []

  if (!isRecord(value)) {
    return { valid: false, errors: ['The import root must be an object.'] }
  }

  const manifest = value.manifest
  if (!isRecord(manifest)) {
    errors.push('The LexiDeck manifest is missing.')
  } else {
    if (manifest.appName !== 'LexiDeck') {
      errors.push('The manifest appName must be LexiDeck.')
    }
    if (manifest.exportVersion !== 1) {
      errors.push('This export version is not supported.')
    }
    if (manifest.dataVersion !== 1) {
      errors.push('This data version is not supported.')
    }
    if (manifest.mediaIncluded !== false) {
      errors.push('Export v1 must not include media.')
    }
    requireString(manifest, 'appVersion', 'manifest', errors)
    requireIsoString(manifest, 'exportedAt', 'manifest', errors)
  }

  for (const table of requiredTables) {
    if (!Array.isArray(value[table])) {
      errors.push(`The required ${table} table is missing.`)
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  validateRecords(value.decks as unknown[], validateDeck, 'decks', errors)
  validateRecords(value.lessons as unknown[], validateLesson, 'lessons', errors)
  validateRecords(value.cards as unknown[], validateCard, 'cards', errors)
  validateRecords(
    value.reviewStates as unknown[],
    validateReviewState,
    'reviewStates',
    errors,
  )
  validateRecords(
    value.reviewLogs as unknown[],
    validateReviewLog,
    'reviewLogs',
    errors,
  )
  validateRecords(
    value.settings as unknown[],
    validateSettings,
    'settings',
    errors,
  )
  validateRecords(
    value.knownWords as unknown[],
    validateKnownWord,
    'knownWords',
    errors,
  )
  if (errors.length === 0) {
    validateRelationships(value as unknown as ExportBundleV1, errors)
  }

  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true, bundle: value as ExportBundleV1 }
}

export function parseAndValidateImportJson(
  json: string,
): ImportValidationResult {
  const parsed = parseJson(json)

  if (!parsed.ok) {
    return { valid: false, errors: ['The selected file is not valid JSON.'] }
  }

  return validateImportBundle(parsed.value)
}

function validateRelationships(bundle: ExportBundleV1, errors: string[]) {
  validateUniqueIds(bundle.decks, 'decks', errors)
  validateUniqueIds(bundle.lessons, 'lessons', errors)
  validateUniqueIds(bundle.cards, 'cards', errors)
  validateUniqueIds(bundle.reviewStates, 'reviewStates', errors)
  validateUniqueIds(bundle.reviewLogs, 'reviewLogs', errors)
  validateUniqueIds(bundle.settings, 'settings', errors)
  validateUniqueIds(bundle.knownWords, 'knownWords', errors)

  const deckIds = new Set(bundle.decks.map((deck) => deck.id))
  const lessonById = new Map(
    bundle.lessons.map((lesson) => [lesson.id, lesson]),
  )
  const cardIds = new Set(bundle.cards.map((card) => card.id))
  const reviewStateCards = new Set<string>()

  bundle.lessons.forEach((lesson, index) => {
    if (!deckIds.has(lesson.deckId)) {
      errors.push(`lessons[${index}].deckId does not reference a deck.`)
    }
  })
  bundle.cards.forEach((card, index) => {
    const lesson = lessonById.get(card.lessonId)
    if (!deckIds.has(card.deckId)) {
      errors.push(`cards[${index}].deckId does not reference a deck.`)
    }
    if (!lesson || lesson.deckId !== card.deckId) {
      errors.push(
        `cards[${index}].lessonId does not reference a lesson in its deck.`,
      )
    }
    if (card.relatedCardId && !cardIds.has(card.relatedCardId)) {
      errors.push(`cards[${index}].relatedCardId does not reference a card.`)
    }
  })
  bundle.reviewStates.forEach((reviewState, index) => {
    if (!cardIds.has(reviewState.cardId)) {
      errors.push(
        `reviewStates[${index}].cardId does not reference a card.`,
      )
    }
    if (reviewStateCards.has(reviewState.cardId)) {
      errors.push(`Multiple review states reference card ${reviewState.cardId}.`)
    }
    reviewStateCards.add(reviewState.cardId)
  })
  bundle.reviewLogs.forEach((reviewLog, index) => {
    if (!cardIds.has(reviewLog.cardId)) {
      errors.push(`reviewLogs[${index}].cardId does not reference a card.`)
    }
  })
}

function validateUniqueIds(
  records: Array<{ id: string }>,
  table: string,
  errors: string[],
) {
  const ids = new Set<string>()
  records.forEach((record, index) => {
    if (ids.has(record.id)) {
      errors.push(`${table}[${index}].id is duplicated.`)
    }
    ids.add(record.id)
  })
}

function validateRecords(
  records: unknown[],
  validator: (record: RecordValue, path: string, errors: string[]) => void,
  table: string,
  errors: string[],
) {
  records.forEach((record, index) => {
    const path = `${table}[${index}]`
    if (!isRecord(record)) {
      errors.push(`${path} must be an object.`)
      return
    }
    validator(record, path, errors)
  })
}

function validateDeck(record: RecordValue, path: string, errors: string[]) {
  validateEntityBase(record, path, errors)
  requireString(record, 'name', path, errors)
  requireString(record, 'description', path, errors)
  requireEnum(record, 'myLanguage', ['en', 'zh-Hans'], path, errors)
  requireEnum(record, 'targetLanguage', ['nl'], path, errors)
  optionalIsoString(record, 'archivedAt', path, errors)
}

function validateLesson(record: RecordValue, path: string, errors: string[]) {
  validateEntityBase(record, path, errors)
  requireString(record, 'deckId', path, errors)
  requireString(record, 'title', path, errors)
  requireString(record, 'description', path, errors)
  requireNumber(record, 'order', path, errors)
  optionalIsoString(record, 'archivedAt', path, errors)
}

function validateCard(record: RecordValue, path: string, errors: string[]) {
  validateEntityBase(record, path, errors)
  requireString(record, 'deckId', path, errors)
  requireString(record, 'lessonId', path, errors)
  requireEnum(
    record,
    'cardType',
    [
      'myLanguageToDutch',
      'imageToDutch',
      'dutchToMyLanguage',
      'dutchToImage',
    ],
    path,
    errors,
  )
  const isImageCard =
    record.cardType === 'imageToDutch' || record.cardType === 'dutchToImage'
  requireString(record, 'frontText', path, errors, isImageCard)
  if (isImageCard) {
    requireString(record, 'frontImageId', path, errors)
  } else {
    optionalString(record, 'frontImageId', path, errors)
  }
  requireString(record, 'backDutch', path, errors)
  requireString(record, 'backMyLanguage', path, errors, isImageCard)
  requireEnum(record, 'article', ['de', 'het', 'none', 'unknown'], path, errors)
  requireString(record, 'notes', path, errors, true)
  optionalString(record, 'relatedCardId', path, errors)
  optionalIsoString(record, 'suspendedAt', path, errors)
  optionalIsoString(record, 'archivedAt', path, errors)
}

function validateReviewState(
  record: RecordValue,
  path: string,
  errors: string[],
) {
  validateEntityBase(record, path, errors)
  requireString(record, 'cardId', path, errors)
  requireIsoString(record, 'dueAt', path, errors)
  optionalIsoString(record, 'lastReviewedAt', path, errors)
  requireNumber(record, 'intervalDays', path, errors)
  optionalNumber(record, 'stability', path, errors)
  optionalNumber(record, 'difficulty', path, errors)
  requireNumber(record, 'lapses', path, errors)
  requireNumber(record, 'reviewCount', path, errors)
}

function validateReviewLog(
  record: RecordValue,
  path: string,
  errors: string[],
) {
  requireString(record, 'id', path, errors)
  requireString(record, 'cardId', path, errors)
  requireIsoString(record, 'reviewedAt', path, errors)
  requireEnum(record, 'rating', ['again', 'hard', 'good', 'easy'], path, errors)
  requireIsoString(record, 'previousDueAt', path, errors)
  requireIsoString(record, 'nextDueAt', path, errors)
  requireNumber(record, 'previousIntervalDays', path, errors)
  requireNumber(record, 'nextIntervalDays', path, errors)
  optionalNumber(record, 'responseTimeMs', path, errors)
}

function validateSettings(record: RecordValue, path: string, errors: string[]) {
  validateEntityBase(record, path, errors)
  requireBoolean(record, 'autoPlayAudio', path, errors)
  requireNumber(record, 'speechRate', path, errors)
  optionalString(record, 'preferredVoiceURI', path, errors)
}

function validateKnownWord(record: RecordValue, path: string, errors: string[]) {
  validateEntityBase(record, path, errors)
  requireString(record, 'normalizedText', path, errors)
  requireString(record, 'displayText', path, errors)
  requireEnum(record, 'article', ['de', 'het', 'none', 'unknown'], path, errors)
  requireEnum(record, 'source', ['manual', 'candidate'], path, errors)
}

function validateEntityBase(
  record: RecordValue,
  path: string,
  errors: string[],
) {
  requireString(record, 'id', path, errors)
  requireIsoString(record, 'createdAt', path, errors)
  requireIsoString(record, 'updatedAt', path, errors)
}

function requireString(
  record: RecordValue,
  key: string,
  path: string,
  errors: string[],
  allowEmpty = false,
) {
  if (
    typeof record[key] !== 'string' ||
    (!allowEmpty && (record[key] as string).trim().length === 0)
  ) {
    errors.push(`${path}.${key} must be a string${allowEmpty ? '' : ' with content'}.`)
  }
}

function optionalString(
  record: RecordValue,
  key: string,
  path: string,
  errors: string[],
) {
  if (record[key] !== undefined && typeof record[key] !== 'string') {
    errors.push(`${path}.${key} must be a string when present.`)
  }
}

function requireNumber(
  record: RecordValue,
  key: string,
  path: string,
  errors: string[],
) {
  if (typeof record[key] !== 'number' || !Number.isFinite(record[key])) {
    errors.push(`${path}.${key} must be a finite number.`)
  }
}

function optionalNumber(
  record: RecordValue,
  key: string,
  path: string,
  errors: string[],
) {
  if (
    record[key] !== undefined &&
    (typeof record[key] !== 'number' || !Number.isFinite(record[key]))
  ) {
    errors.push(`${path}.${key} must be a finite number when present.`)
  }
}

function requireBoolean(
  record: RecordValue,
  key: string,
  path: string,
  errors: string[],
) {
  if (typeof record[key] !== 'boolean') {
    errors.push(`${path}.${key} must be a boolean.`)
  }
}

function requireEnum(
  record: RecordValue,
  key: string,
  allowed: readonly string[],
  path: string,
  errors: string[],
) {
  if (typeof record[key] !== 'string' || !allowed.includes(record[key])) {
    errors.push(`${path}.${key} has an unsupported value.`)
  }
}

function requireIsoString(
  record: RecordValue,
  key: string,
  path: string,
  errors: string[],
) {
  if (!isIsoString(record[key])) {
    errors.push(`${path}.${key} must be a valid ISO date string.`)
  }
}

function optionalIsoString(
  record: RecordValue,
  key: string,
  path: string,
  errors: string[],
) {
  if (record[key] !== undefined && !isIsoString(record[key])) {
    errors.push(`${path}.${key} must be a valid ISO date string when present.`)
  }
}

function isIsoString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
