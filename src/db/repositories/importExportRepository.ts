import { APP_VERSION } from '../../app/version'
import {
  buildExportBundle,
  serializeExportBundle,
} from '../../domain/importExport/exportDatabase'
import {
  summarizeBundle,
  verifyImportedCounts,
} from '../../domain/importExport/importDatabase'
import { planDatabaseMerge } from '../../domain/importExport/mergeDatabase'
import type {
  ExportBundleV1,
  ImportSummary,
  MediaImportSummary,
  MergePlan,
} from '../../domain/importExport/exportTypes'
import { validateImportBundle } from '../../domain/importExport/validateImportBundle'
import { nowIso } from '../../utils/dates'
import { createId } from '../../utils/ids'
import { db } from '../dexie'
import type { ExportableCard } from '../../domain/importExport/cardTextExport'
import {
  createMediaBackupZip,
  validateMediaExportPackage,
} from '../../domain/importExport/mediaBackup'
import type {
  MediaExportPackageV2,
  RestoredMediaPackageV2,
  SourceImageExportRecord,
} from '../../domain/importExport/mediaExportTypes'
import { currentDataVersion } from '../migrations'

const tables = [
  db.decks,
  db.lessons,
  db.cards,
  db.reviewStates,
  db.reviewLogs,
  db.settings,
  db.knownWords,
] as const

const destructiveImportTables = [
  ...tables,
  db.sourceImages,
  db.ocrTexts,
  db.vocabularyCandidates,
] as const

export async function exportDatabase(): Promise<ExportBundleV1> {
  const [
    decks,
    lessons,
    cards,
    reviewStates,
    reviewLogs,
    settings,
    knownWords,
  ] = await Promise.all([
    db.decks.toArray(),
    db.lessons.toArray(),
    db.cards.toArray(),
    db.reviewStates.toArray(),
    db.reviewLogs.toArray(),
    db.settings.toArray(),
    db.knownWords.toArray(),
  ])

  return buildExportBundle(
    {
      decks,
      lessons,
      cards,
      reviewStates,
      reviewLogs,
      settings,
      knownWords,
    },
    APP_VERSION,
    nowIso(),
  )
}

export async function exportDatabaseJson(): Promise<{
  bundle: ExportBundleV1
  json: string
}> {
  const bundle = await exportDatabase()
  return { bundle, json: serializeExportBundle(bundle) }
}

export async function exportMediaBackup(): Promise<{
  mediaPackage: MediaExportPackageV2
  blob: Blob
}> {
  const [
    bundle,
    sourceImages,
    ocrTexts,
    vocabularyCandidates,
  ] = await Promise.all([
    exportDatabase(),
    db.sourceImages.toArray(),
    db.ocrTexts.toArray(),
    db.vocabularyCandidates.toArray(),
  ])
  const mediaPackage: MediaExportPackageV2 = {
    manifest: {
      appName: 'LexiDeck',
      appVersion: APP_VERSION,
      exportVersion: 2,
      exportedAt: nowIso(),
      dataVersion: currentDataVersion,
      mediaIncluded: true,
    },
    decks: bundle.decks,
    lessons: bundle.lessons,
    cards: bundle.cards,
    reviewStates: bundle.reviewStates,
    reviewLogs: bundle.reviewLogs,
    settings: bundle.settings,
    knownWords: bundle.knownWords,
    sourceImages: sourceImages.map(toSourceImageExportRecord),
    ocrTexts,
    vocabularyCandidates,
  }
  const imageBlobs = new Map(sourceImages.map((image) => [image.id, image.blob]))
  return {
    mediaPackage,
    blob: await createMediaBackupZip(mediaPackage, imageBlobs),
  }
}

export async function replaceDatabase(
  bundle: ExportBundleV1,
): Promise<ImportSummary> {
  const validation = validateImportBundle(bundle)
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }
  const expected = summarizeBundle(validation.bundle)

  await db.transaction('rw', [...destructiveImportTables], async () => {
    await Promise.all(destructiveImportTables.map((table) => table.clear()))
    await addBundle(validation.bundle)
  })

  const actual = await getDatabaseSummary()
  verifyImportedCounts(expected, actual)
  return actual
}

export async function replaceDatabaseWithMedia(
  restoredPackage: RestoredMediaPackageV2,
): Promise<MediaImportSummary> {
  validateMediaExportPackage({
    ...restoredPackage,
    sourceImages: restoredPackage.sourceImages.map(toSourceImageExportRecord),
  })
  const coreBundle = toCoreBundle(restoredPackage)
  const expected: MediaImportSummary = {
    ...summarizeBundle(coreBundle),
    sourceImages: restoredPackage.sourceImages.length,
    ocrTexts: restoredPackage.ocrTexts.length,
    vocabularyCandidates: restoredPackage.vocabularyCandidates.length,
  }

  await db.transaction('rw', [...destructiveImportTables], async () => {
    await Promise.all(destructiveImportTables.map((table) => table.clear()))
    await addBundle(coreBundle)
    if (restoredPackage.sourceImages.length > 0) {
      await db.sourceImages.bulkAdd(restoredPackage.sourceImages)
    }
    if (restoredPackage.ocrTexts.length > 0) {
      await db.ocrTexts.bulkAdd(restoredPackage.ocrTexts)
    }
    if (restoredPackage.vocabularyCandidates.length > 0) {
      await db.vocabularyCandidates.bulkAdd(
        restoredPackage.vocabularyCandidates,
      )
    }
  })

  const actual = await getMediaDatabaseSummary()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('The restored media backup could not be verified.')
  }
  return actual
}

export async function clearLocalData(): Promise<void> {
  await db.transaction('rw', [...destructiveImportTables], async () => {
    await Promise.all(destructiveImportTables.map((table) => table.clear()))
  })
}

function toCoreBundle(
  mediaPackage: RestoredMediaPackageV2,
): ExportBundleV1 {
  return {
    manifest: {
      appName: 'LexiDeck',
      appVersion: mediaPackage.manifest.appVersion,
      exportVersion: 1,
      exportedAt: mediaPackage.manifest.exportedAt,
      dataVersion: 1,
      mediaIncluded: false,
    },
    decks: mediaPackage.decks,
    lessons: mediaPackage.lessons,
    cards: mediaPackage.cards,
    reviewStates: mediaPackage.reviewStates,
    reviewLogs: mediaPackage.reviewLogs,
    settings: mediaPackage.settings,
    knownWords: mediaPackage.knownWords,
  }
}

function toSourceImageExportRecord(image: {
  id: string
  deckId: string
  lessonId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  width: number
  height: number
  ocrStatus: 'notStarted' | 'pending' | 'complete' | 'failed'
  createdAt: string
  updatedAt: string
  archivedAt?: string
}): SourceImageExportRecord {
  return {
    id: image.id,
    deckId: image.deckId,
    lessonId: image.lessonId,
    fileName: image.fileName,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    width: image.width,
    height: image.height,
    ocrStatus: image.ocrStatus,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
    archivedAt: image.archivedAt,
    mediaPath: `media/source-images/${image.id}.blob`,
  }
}

export async function analyzeDatabaseMerge(
  imported: ExportBundleV1,
): Promise<MergePlan> {
  const validation = validateImportBundle(imported)
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }

  const existing = await exportDatabase()
  return planDatabaseMerge(
    existing,
    validation.bundle,
    createId,
    nowIso(),
  )
}

export async function mergeDatabase(plan: MergePlan): Promise<MergePlan> {
  const validation = validateImportBundle(plan.bundle)
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }

  const before = await getDatabaseSummary()
  await db.transaction('rw', [...tables], async () => {
    await addBundle(validation.bundle)
  })
  const after = await getDatabaseSummary()
  verifyMergeCounts(before, after, plan)

  return plan
}

export async function getDatabaseSummary(): Promise<ImportSummary> {
  const counts = await Promise.all(tables.map((table) => table.count()))
  return {
    decks: counts[0],
    lessons: counts[1],
    cards: counts[2],
    reviewStates: counts[3],
    reviewLogs: counts[4],
    settings: counts[5],
    knownWords: counts[6],
  }
}

async function getMediaDatabaseSummary(): Promise<MediaImportSummary> {
  const [summary, sourceImages, ocrTexts, vocabularyCandidates] =
    await Promise.all([
      getDatabaseSummary(),
      db.sourceImages.count(),
      db.ocrTexts.count(),
      db.vocabularyCandidates.count(),
    ])
  return { ...summary, sourceImages, ocrTexts, vocabularyCandidates }
}

export async function listExportableCards(): Promise<ExportableCard[]> {
  const [cards, decks, lessons, sourceImages] = await Promise.all([
    db.cards.filter((card) => !card.archivedAt).toArray(),
    db.decks.filter((deck) => !deck.archivedAt).toArray(),
    db.lessons.filter((lesson) => !lesson.archivedAt).toArray(),
    db.sourceImages.toArray(),
  ])
  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const imageById = new Map(sourceImages.map((image) => [image.id, image]))

  return cards
    .flatMap((card): ExportableCard[] => {
      const deck = deckById.get(card.deckId)
      const lesson = lessonById.get(card.lessonId)
      if (!deck || !lesson || lesson.deckId !== deck.id) {
        return []
      }

      return [
        {
          card,
          deck,
          lesson,
          imageFileName: card.frontImageId
            ? imageById.get(card.frontImageId)?.fileName
            : undefined,
        },
      ]
    })
    .sort(
      (left, right) =>
        left.deck.name.localeCompare(right.deck.name) ||
        left.lesson.order - right.lesson.order ||
        left.card.createdAt.localeCompare(right.card.createdAt),
    )
}

async function addBundle(bundle: ExportBundleV1): Promise<void> {
  if (bundle.decks.length > 0) await db.decks.bulkAdd(bundle.decks)
  if (bundle.lessons.length > 0) await db.lessons.bulkAdd(bundle.lessons)
  if (bundle.cards.length > 0) await db.cards.bulkAdd(bundle.cards)
  if (bundle.reviewStates.length > 0) {
    await db.reviewStates.bulkAdd(bundle.reviewStates)
  }
  if (bundle.reviewLogs.length > 0) {
    await db.reviewLogs.bulkAdd(bundle.reviewLogs)
  }
  if (bundle.settings.length > 0) await db.settings.bulkAdd(bundle.settings)
  if (bundle.knownWords.length > 0) {
    await db.knownWords.bulkAdd(bundle.knownWords)
  }
}

function verifyMergeCounts(
  before: ImportSummary,
  after: ImportSummary,
  plan: MergePlan,
): void {
  const expected: ImportSummary = {
    decks: before.decks + plan.summary.decks,
    lessons: before.lessons + plan.summary.lessons,
    cards: before.cards + plan.summary.cards,
    reviewStates: before.reviewStates + plan.summary.reviewStates,
    reviewLogs: before.reviewLogs + plan.summary.reviewLogs,
    settings: before.settings + plan.summary.settings,
    knownWords: before.knownWords + plan.summary.knownWords,
  }
  verifyImportedCounts(expected, after)
}
