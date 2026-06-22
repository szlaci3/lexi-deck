export type Lesson = {
  id: string
  deckId: string
  title: string
  description: string
  order: number
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export type CreateLessonInput = Pick<Lesson, 'title' | 'description'>
export type UpdateLessonInput = Partial<CreateLessonInput>

export type LessonSummary = {
  lesson: Lesson
  cardCount: number
  dueCount: number
}
