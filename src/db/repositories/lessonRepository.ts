import type {
  CreateLessonInput,
  Lesson,
  LessonSummary,
  UpdateLessonInput,
} from '../../domain/lessons/lessonTypes'
import { validateLessonInput } from '../../domain/lessons/lessonValidation'
import { nowIso } from '../../utils/dates'
import { createId } from '../../utils/ids'
import { db } from '../dexie'
import {
  countDueCards,
  countEligibleStudyCards,
} from './reviewRepository'

export class LessonNotFoundError extends Error {
  constructor() {
    super('This lesson could not be found.')
    this.name = 'LessonNotFoundError'
  }
}

export class LessonDeckUnavailableError extends Error {
  constructor() {
    super('The deck for this lesson could not be found or is archived.')
    this.name = 'LessonDeckUnavailableError'
  }
}

function validatedInput(
  input: CreateLessonInput | UpdateLessonInput,
): CreateLessonInput {
  const result = validateLessonInput(input)

  if (!result.valid) {
    throw new Error(Object.values(result.errors)[0] ?? 'The lesson is invalid.')
  }

  return result.value
}

export async function createLesson(
  deckId: string,
  input: CreateLessonInput,
): Promise<Lesson> {
  const deck = await db.decks.get(deckId)

  if (!deck || deck.archivedAt) {
    throw new LessonDeckUnavailableError()
  }

  const value = validatedInput(input)
  const existingLessons = await db.lessons.where('deckId').equals(deckId).toArray()
  const nextOrder =
    existingLessons.reduce(
      (highestOrder, lesson) => Math.max(highestOrder, lesson.order),
      0,
    ) + 1
  const timestamp = nowIso()
  const lesson: Lesson = {
    id: createId(),
    deckId,
    title: value.title,
    description: value.description,
    order: nextOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.lessons.add(lesson)
  return lesson
}

export async function updateLesson(
  id: string,
  input: UpdateLessonInput,
): Promise<Lesson> {
  const existingLesson = await getLessonById(id)

  if (!existingLesson) {
    throw new LessonNotFoundError()
  }

  const value = validatedInput({
    title: input.title ?? existingLesson.title,
    description: input.description ?? existingLesson.description,
  })
  const updatedLesson: Lesson = {
    ...existingLesson,
    ...value,
    updatedAt: nowIso(),
  }

  await db.lessons.put(updatedLesson)
  return updatedLesson
}

export async function getLessonById(id: string): Promise<Lesson | undefined> {
  return db.lessons.get(id)
}

export async function listActiveLessonsByDeckId(
  deckId: string,
): Promise<Lesson[]> {
  const lessons = await db.lessons
    .where('deckId')
    .equals(deckId)
    .filter((lesson) => !lesson.archivedAt)
    .toArray()

  return lessons.sort((left, right) => left.order - right.order)
}

export async function archiveLesson(id: string): Promise<void> {
  const lesson = await getLessonById(id)

  if (!lesson) {
    throw new LessonNotFoundError()
  }

  const timestamp = nowIso()
  await db.lessons.put({
    ...lesson,
    archivedAt: timestamp,
    updatedAt: timestamp,
  })
}

export async function getLessonSummary(
  id: string,
): Promise<LessonSummary | undefined> {
  const lesson = await getLessonById(id)

  if (!lesson || lesson.archivedAt) {
    return undefined
  }

  return buildLessonSummary(lesson)
}

export async function listActiveLessonSummariesByDeckId(
  deckId: string,
): Promise<LessonSummary[]> {
  return Promise.all(
    (await listActiveLessonsByDeckId(deckId)).map(buildLessonSummary),
  )
}

async function buildLessonSummary(lesson: Lesson): Promise<LessonSummary> {
  const [cardCount, dueCount] = await Promise.all([
    countEligibleStudyCards({
      deckId: lesson.deckId,
      lessonId: lesson.id,
    }),
    countDueCards(nowIso(), lesson.deckId, lesson.id),
  ])

  return {
    lesson,
    cardCount,
    dueCount,
  }
}
