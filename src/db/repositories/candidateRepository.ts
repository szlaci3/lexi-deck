import { createCardRecords } from '../../domain/cards/cardFactory'
import { formatDutchText } from '../../domain/cards/cardDisplay'
import { validateCardInput } from '../../domain/cards/cardValidation'
import {
  createCandidateDraft,
  detectCandidateType,
  extractVocabularyCandidates,
} from '../../domain/vocabulary/candidateExtraction'
import { classifyCandidateDuplicate } from '../../domain/vocabulary/candidateDuplicates'
import type {
  CandidateDuplicateStatus,
  CandidateStatus,
  UpdateCandidateInput,
  VocabularyCandidate,
} from '../../domain/vocabulary/candidateTypes'
import type { KnownWord } from '../../domain/vocabulary/knownWords'
import { normalizeDutchNoun } from '../../domain/duplicates/normalizeText'
import { nowIso } from '../../utils/dates'
import { createId } from '../../utils/ids'
import { db } from '../dexie'

export class CandidateNotFoundError extends Error {
  constructor() {
    super('This vocabulary candidate could not be found.')
    this.name = 'CandidateNotFoundError'
  }
}

export async function listCandidatesByOcrTextId(
  ocrTextId: string,
): Promise<VocabularyCandidate[]> {
  const candidates = await db.vocabularyCandidates
    .where('ocrTextId')
    .equals(ocrTextId)
    .toArray()

  return candidates.sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  )
}

export async function extractCandidatesFromOcrText(
  ocrTextId: string,
): Promise<VocabularyCandidate[]> {
  const ocrText = await db.ocrTexts.get(ocrTextId)
  if (!ocrText) {
    throw new Error('The OCR text could not be found.')
  }

  const sourceImage = await db.sourceImages.get(ocrText.sourceImageId)
  if (!sourceImage || sourceImage.archivedAt) {
    throw new Error('The source image could not be found.')
  }

  const existingForOcr = await listCandidatesByOcrTextId(ocrTextId)
  const existingNormalized = new Set(
    existingForOcr.map((candidate) => candidate.normalizedText),
  )
  const knownWords = await db.knownWords.toArray()
  const knownNormalized = new Set(
    knownWords.map((knownWord) => knownWord.normalizedText),
  )
  const drafts = extractVocabularyCandidates(ocrText.rawText).filter(
    (draft) =>
      !existingNormalized.has(draft.normalizedText) &&
      !knownNormalized.has(draft.normalizedText),
  )

  if (drafts.length > 0) {
    const timestamp = nowIso()
    const candidates = drafts.map(
      (draft): VocabularyCandidate => ({
        id: createId(),
        deckId: sourceImage.deckId,
        lessonId: sourceImage.lessonId,
        sourceImageId: sourceImage.id,
        ocrTextId,
        ...draft,
        status: 'pending',
        duplicateStatus: 'unique',
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    )
    await db.vocabularyCandidates.bulkAdd(candidates)
  }

  await refreshCandidateDuplicatesForLesson(sourceImage.lessonId)
  return listCandidatesByOcrTextId(ocrTextId)
}

export async function createCandidateFromSelection(
  ocrTextId: string,
  selectedText: string,
): Promise<VocabularyCandidate> {
  const draft = createCandidateDraft(selectedText)
  if (!draft) {
    throw new Error('Select or enter Dutch text first.')
  }

  const ocrText = await db.ocrTexts.get(ocrTextId)
  const sourceImage = ocrText
    ? await db.sourceImages.get(ocrText.sourceImageId)
    : undefined

  if (!ocrText || !sourceImage || sourceImage.archivedAt) {
    throw new Error('The OCR source could not be found.')
  }

  const timestamp = nowIso()
  const candidate: VocabularyCandidate = {
    id: createId(),
    deckId: sourceImage.deckId,
    lessonId: sourceImage.lessonId,
    sourceImageId: sourceImage.id,
    ocrTextId,
    ...draft,
    status: 'pending',
    duplicateStatus: 'unique',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  candidate.duplicateStatus = await classifyDuplicate(candidate)
  await db.vocabularyCandidates.add(candidate)
  return candidate
}

export async function updateCandidate(
  id: string,
  input: UpdateCandidateInput,
): Promise<VocabularyCandidate> {
  const candidate = await requireCandidate(id)
  const rawText = input.rawText.trim()
  const myLanguageMeaning = input.myLanguageMeaning.trim()

  if (!rawText) {
    throw new Error('Enter the Dutch text.')
  }

  const updated: VocabularyCandidate = {
    ...candidate,
    rawText,
    normalizedText: normalizeDutchNoun(
      formatDutchText(input.article, rawText),
    ),
    candidateType: detectCandidateType(rawText),
    article: input.article,
    myLanguageMeaning,
    updatedAt: nowIso(),
  }
  updated.duplicateStatus = await classifyDuplicate(updated)
  await db.vocabularyCandidates.put(updated)
  return updated
}

export async function setCandidateStatus(
  id: string,
  status: Extract<CandidateStatus, 'approved' | 'rejected'>,
): Promise<VocabularyCandidate> {
  const candidate = await requireCandidate(id)
  if (candidate.status === 'converted' || candidate.status === 'known') {
    throw new Error('This candidate has already been completed.')
  }

  const updated = { ...candidate, status, updatedAt: nowIso() }
  await db.vocabularyCandidates.put(updated)
  return updated
}

export async function markCandidateKnown(
  id: string,
): Promise<VocabularyCandidate> {
  const candidate = await requireCandidate(id)
  if (candidate.status === 'converted') {
    throw new Error('This candidate has already become a card.')
  }

  const existingKnownWord = await db.knownWords
    .where('normalizedText')
    .equals(candidate.normalizedText)
    .first()
  const timestamp = nowIso()
  const knownWord: KnownWord | undefined = existingKnownWord
    ? undefined
    : {
        id: createId(),
        normalizedText: candidate.normalizedText,
        displayText: formatDutchText(candidate.article, candidate.rawText),
        article: candidate.article,
        source: 'candidate',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
  const updated: VocabularyCandidate = {
    ...candidate,
    status: 'known',
    duplicateStatus: 'known',
    updatedAt: timestamp,
  }

  await db.transaction(
    'rw',
    db.vocabularyCandidates,
    db.knownWords,
    async () => {
      if (knownWord) {
        await db.knownWords.add(knownWord)
      }
      await db.vocabularyCandidates.put(updated)
    },
  )
  return updated
}

export async function convertCandidateToCard(
  id: string,
): Promise<VocabularyCandidate> {
  const candidate = await requireCandidate(id)
  if (candidate.status !== 'approved') {
    throw new Error('Approve this candidate before creating a card.')
  }

  const [deck, lesson] = await Promise.all([
    db.decks.get(candidate.deckId),
    db.lessons.get(candidate.lessonId),
  ])
  if (
    !deck ||
    deck.archivedAt ||
    !lesson ||
    lesson.archivedAt ||
    lesson.deckId !== candidate.deckId
  ) {
    throw new Error('The candidate deck or lesson is no longer available.')
  }

  const validation = validateCardInput({
    lessonId: candidate.lessonId,
    frontText: candidate.myLanguageMeaning,
    backDutch: candidate.rawText,
    article: candidate.article,
    notes: '',
  })
  if (!validation.valid) {
    throw new Error(
      Object.values(validation.errors)[0] ??
        'The candidate is not ready to become a card.',
    )
  }

  const timestamp = nowIso()
  const records = createCardRecords(
    { deckId: candidate.deckId, ...validation.value },
    { cardId: createId(), reviewStateId: createId() },
    timestamp,
  )
  const card = { ...records.card, sourceCandidateId: candidate.id }
  const updated: VocabularyCandidate = {
    ...candidate,
    status: 'converted',
    updatedAt: timestamp,
  }

  await db.transaction(
    'rw',
    db.vocabularyCandidates,
    db.cards,
    db.reviewStates,
    async () => {
      await db.cards.add(card)
      await db.reviewStates.add(records.reviewState)
      await db.vocabularyCandidates.put(updated)
    },
  )
  return updated
}

async function refreshCandidateDuplicatesForLesson(
  lessonId: string,
): Promise<VocabularyCandidate[]> {
  const candidates = await db.vocabularyCandidates
    .where('lessonId')
    .equals(lessonId)
    .toArray()
  const [cards, knownWords] = await Promise.all([
    db.cards.filter((card) => !card.archivedAt).toArray(),
    db.knownWords.toArray(),
  ])
  const updated = candidates.map((candidate) => ({
    ...candidate,
    duplicateStatus: classifyCandidateDuplicate(
      candidate,
      cards,
      candidates,
      knownWords,
    ),
  }))
  await db.vocabularyCandidates.bulkPut(updated)
  return updated
}

async function classifyDuplicate(
  candidate: VocabularyCandidate,
): Promise<CandidateDuplicateStatus> {
  const [cards, candidates, knownWords] = await Promise.all([
    db.cards.filter((card) => !card.archivedAt).toArray(),
    db.vocabularyCandidates
      .where('lessonId')
      .equals(candidate.lessonId)
      .toArray(),
    db.knownWords.toArray(),
  ])
  return classifyCandidateDuplicate(candidate, cards, candidates, knownWords)
}

async function requireCandidate(id: string): Promise<VocabularyCandidate> {
  const candidate = await db.vocabularyCandidates.get(id)
  if (!candidate) {
    throw new CandidateNotFoundError()
  }
  return candidate
}
