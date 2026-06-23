import type {
  OptimizedImage,
  SourceImage,
} from '../../domain/media/mediaTypes'
import { nowIso } from '../../utils/dates'
import { createId } from '../../utils/ids'
import { db } from '../dexie'

export class SourceImageNotFoundError extends Error {
  constructor() {
    super('This source image could not be found.')
    this.name = 'SourceImageNotFoundError'
  }
}

export class SourceImageLocationError extends Error {
  constructor() {
    super('The selected deck or lesson is unavailable.')
    this.name = 'SourceImageLocationError'
  }
}

export async function createSourceImage(
  deckId: string,
  lessonId: string,
  optimizedImage: OptimizedImage,
): Promise<SourceImage> {
  const [deck, lesson] = await Promise.all([
    db.decks.get(deckId),
    db.lessons.get(lessonId),
  ])

  if (
    !deck ||
    deck.archivedAt ||
    !lesson ||
    lesson.archivedAt ||
    lesson.deckId !== deckId
  ) {
    throw new SourceImageLocationError()
  }

  const timestamp = nowIso()
  const sourceImage: SourceImage = {
    id: createId(),
    deckId,
    lessonId,
    ...optimizedImage,
    ocrStatus: 'notStarted',
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.sourceImages.add(sourceImage)
  return sourceImage
}

export async function getSourceImageById(
  id: string,
): Promise<SourceImage | undefined> {
  return db.sourceImages.get(id)
}

export async function getSourceImagesByIds(
  ids: string[],
): Promise<Map<string, SourceImage>> {
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length === 0) {
    return new Map()
  }
  const images = await db.sourceImages.bulkGet(uniqueIds)
  return new Map(
    images
      .filter(
        (image): image is SourceImage =>
          image !== undefined && !image.archivedAt,
      )
      .map((image) => [image.id, image]),
  )
}

export async function listActiveSourceImagesByLessonId(
  lessonId: string,
): Promise<SourceImage[]> {
  const images = await db.sourceImages
    .where('lessonId')
    .equals(lessonId)
    .filter((image) => !image.archivedAt)
    .toArray()

  return images.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )
}

export async function archiveSourceImage(id: string): Promise<void> {
  const image = await getSourceImageById(id)

  if (!image) {
    throw new SourceImageNotFoundError()
  }
  const activeImageCard = await db.cards
    .filter(
      (card) =>
        !card.archivedAt &&
        card.frontImageId === id &&
        (card.cardType === 'imageToDutch' || card.cardType === 'dutchToImage'),
    )
    .first()
  if (activeImageCard) {
    throw new Error(
      'Archive the active image card before archiving its source image.',
    )
  }

  const timestamp = nowIso()
  await db.sourceImages.put({
    ...image,
    archivedAt: timestamp,
    updatedAt: timestamp,
  })
}
