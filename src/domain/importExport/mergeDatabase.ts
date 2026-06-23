import { formatDutchText } from '../cards/cardDisplay'
import type { Card } from '../cards/cardTypes'
import { normalizeDutchNoun, normalizeText } from '../duplicates/normalizeText'
import type {
  ExportBundleV1,
  MergePlan,
  MergeSummary,
} from './exportTypes'

type IdFactory = () => string

export function planDatabaseMerge(
  existing: ExportBundleV1,
  imported: ExportBundleV1,
  createId: IdFactory,
  exportedAt: string,
): MergePlan {
  const summary: MergeSummary = {
    decks: 0,
    lessons: 0,
    cards: 0,
    reviewStates: 0,
    reviewLogs: 0,
    settings: 0,
    knownWords: 0,
    renamedDecks: 0,
    remappedIds: 0,
    skippedExactCards: 0,
    possibleDuplicateCards: 0,
    skippedSettings: 0,
    skippedKnownWords: 0,
  }
  const renamedDecks: MergePlan['renamedDecks'] = []
  const possibleDuplicateCardIds: string[] = []
  const usedDeckIds = new Set(existing.decks.map((item) => item.id))
  const usedLessonIds = new Set(existing.lessons.map((item) => item.id))
  const usedCardIds = new Set(existing.cards.map((item) => item.id))
  const usedReviewStateIds = new Set(
    existing.reviewStates.map((item) => item.id),
  )
  const usedReviewLogIds = new Set(existing.reviewLogs.map((item) => item.id))
  const usedKnownWordIds = new Set(existing.knownWords.map((item) => item.id))
  const deckIdMap = new Map<string, string>()
  const lessonIdMap = new Map<string, string>()
  const cardIdMap = new Map<string, string>()
  const skippedCardIds = new Set<string>()

  const usedDeckNames = new Set(
    existing.decks.map((deck) => normalizeText(deck.name)),
  )
  const decks = imported.decks.map((deck) => {
    const id = uniqueId(deck.id, usedDeckIds, createId, summary)
    deckIdMap.set(deck.id, id)
    const name = uniqueDeckName(deck.name, usedDeckNames)
    if (name !== deck.name) {
      summary.renamedDecks += 1
      renamedDecks.push({ originalName: deck.name, importedName: name })
    }
    summary.decks += 1
    return { ...deck, id, name }
  })

  const lessons = imported.lessons.flatMap((lesson) => {
    const deckId = deckIdMap.get(lesson.deckId)
    if (!deckId) {
      return []
    }
    const id = uniqueId(lesson.id, usedLessonIds, createId, summary)
    lessonIdMap.set(lesson.id, id)
    summary.lessons += 1
    return [{ ...lesson, id, deckId }]
  })

  const comparisonCards: Card[] = [...existing.cards]
  const unlinkedCards = imported.cards.flatMap((card) => {
    const deckId = deckIdMap.get(card.deckId)
    const lessonId = lessonIdMap.get(card.lessonId)
    if (!deckId || !lessonId) {
      skippedCardIds.add(card.id)
      return []
    }

    const candidate = { ...card, deckId, lessonId }
    const exactCard = comparisonCards.find((item) =>
      isExactCardDuplicate(item, candidate),
    )
    if (exactCard) {
      skippedCardIds.add(card.id)
      summary.skippedExactCards += 1
      return []
    }

    const id = uniqueId(card.id, usedCardIds, createId, summary)
    cardIdMap.set(card.id, id)
    const importedCard = { ...candidate, id }
    if (comparisonCards.some((item) => isPossibleCardDuplicate(item, importedCard))) {
      summary.possibleDuplicateCards += 1
      possibleDuplicateCardIds.push(id)
    }
    comparisonCards.push(importedCard)
    summary.cards += 1
    return [importedCard]
  })
  const cards = unlinkedCards.map((card) => ({
    ...card,
    relatedCardId: card.relatedCardId
      ? cardIdMap.get(card.relatedCardId)
      : undefined,
  }))

  const importedCardIds = new Set(cards.map((card) => card.id))
  const reviewStateCardIds = new Set<string>()
  const reviewStates = imported.reviewStates.flatMap((reviewState) => {
    if (skippedCardIds.has(reviewState.cardId)) {
      return []
    }
    const cardId = cardIdMap.get(reviewState.cardId)
    if (
      !cardId ||
      !importedCardIds.has(cardId) ||
      reviewStateCardIds.has(cardId)
    ) {
      return []
    }
    reviewStateCardIds.add(cardId)
    const id = uniqueId(
      reviewState.id,
      usedReviewStateIds,
      createId,
      summary,
    )
    summary.reviewStates += 1
    return [{ ...reviewState, id, cardId }]
  })

  const reviewLogs = imported.reviewLogs.flatMap((reviewLog) => {
    if (skippedCardIds.has(reviewLog.cardId)) {
      return []
    }
    const cardId = cardIdMap.get(reviewLog.cardId)
    if (!cardId || !importedCardIds.has(cardId)) {
      return []
    }
    const id = uniqueId(
      reviewLog.id,
      usedReviewLogIds,
      createId,
      summary,
    )
    summary.reviewLogs += 1
    return [{ ...reviewLog, id, cardId }]
  })

  const settings =
    existing.settings.length > 0
      ? []
      : imported.settings.slice(0, 1).map((setting) => {
          summary.settings += 1
          return setting
        })
  summary.skippedSettings = imported.settings.length - settings.length

  const existingKnownWords = new Set(
    existing.knownWords.map(
      (word) => `${normalizeText(word.normalizedText)}|${word.article}`,
    ),
  )
  const knownWords = imported.knownWords.flatMap((knownWord) => {
    const key = `${normalizeText(knownWord.normalizedText)}|${knownWord.article}`
    if (existingKnownWords.has(key)) {
      summary.skippedKnownWords += 1
      return []
    }
    existingKnownWords.add(key)
    const id = uniqueId(knownWord.id, usedKnownWordIds, createId, summary)
    summary.knownWords += 1
    return [{ ...knownWord, id }]
  })

  return {
    bundle: {
      manifest: {
        ...imported.manifest,
        appVersion: existing.manifest.appVersion,
        exportedAt,
      },
      decks,
      lessons,
      cards,
      reviewStates,
      reviewLogs,
      settings,
      knownWords,
    },
    summary,
    renamedDecks,
    possibleDuplicateCardIds,
  }
}

function uniqueId(
  requestedId: string,
  usedIds: Set<string>,
  createId: IdFactory,
  summary: MergeSummary,
): string {
  if (!usedIds.has(requestedId)) {
    usedIds.add(requestedId)
    return requestedId
  }

  let id = createId()
  while (usedIds.has(id)) {
    id = createId()
  }
  usedIds.add(id)
  summary.remappedIds += 1
  return id
}

function uniqueDeckName(name: string, usedNames: Set<string>): string {
  if (!usedNames.has(normalizeText(name))) {
    usedNames.add(normalizeText(name))
    return name
  }

  let index = 1
  let candidate = `${name} (Imported)`
  while (usedNames.has(normalizeText(candidate))) {
    index += 1
    candidate = `${name} (Imported ${index})`
  }
  usedNames.add(normalizeText(candidate))
  return candidate
}

function isExactCardDuplicate(left: Card, right: Card): boolean {
  return (
    left.cardType === right.cardType &&
    normalizeText(left.frontText) === normalizeText(right.frontText) &&
    normalizedDutch(left) === normalizedDutch(right)
  )
}

function isPossibleCardDuplicate(left: Card, right: Card): boolean {
  return (
    !isExactCardDuplicate(left, right) &&
    normalizedDutch(left) === normalizedDutch(right)
  )
}

function normalizedDutch(card: Card): string {
  return normalizeDutchNoun(formatDutchText(card.article, card.backDutch))
}
