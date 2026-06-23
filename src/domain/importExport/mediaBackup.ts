import type { FileEntry } from '@zip.js/zip.js'
import type { SourceImage } from '../media/mediaTypes'
import type {
  MediaExportPackageV2,
  RestoredMediaPackageV2,
  SourceImageExportRecord,
} from './mediaExportTypes'
import { validateImportBundle } from './validateImportBundle'

const tableNames = [
  'decks',
  'lessons',
  'cards',
  'reviewStates',
  'reviewLogs',
  'settings',
  'knownWords',
  'sourceImages',
  'ocrTexts',
  'vocabularyCandidates',
] as const

type TableName = (typeof tableNames)[number]

export async function createMediaBackupZip(
  mediaPackage: MediaExportPackageV2,
  imageBlobs: Map<string, Blob>,
): Promise<Blob> {
  const { BlobReader, BlobWriter, TextReader, ZipWriter } = await import(
    '@zip.js/zip.js'
  )
  validateMediaExportPackage(mediaPackage)
  const writer = new ZipWriter(new BlobWriter('application/zip'))
  await writer.add(
    'manifest.json',
    new TextReader(JSON.stringify(mediaPackage.manifest, null, 2)),
  )

  for (const tableName of tableNames) {
    await writer.add(
      `tables/${tableName}.json`,
      new TextReader(JSON.stringify(mediaPackage[tableName], null, 2)),
    )
  }

  for (const image of mediaPackage.sourceImages) {
    const blob = imageBlobs.get(image.id)
    if (!blob) {
      throw new Error(`Source image media is missing for ${image.id}.`)
    }
    await writer.add(image.mediaPath, new BlobReader(blob))
  }

  return writer.close()
}

export async function readMediaBackupZip(
  blob: Blob,
): Promise<RestoredMediaPackageV2> {
  const { BlobReader, BlobWriter, TextWriter, ZipReader } = await import(
    '@zip.js/zip.js'
  )
  const reader = new ZipReader(new BlobReader(blob))
  try {
    const entries = await reader.getEntries()
    const entryByName = new Map(
      entries
        .filter((entry): entry is FileEntry => !entry.directory)
        .map((entry) => [entry.filename, entry]),
    )
    const readJsonEntry = async (filename: string): Promise<unknown> => {
      const entry = entryByName.get(filename)
      if (!entry) {
        throw new Error(`Required ZIP entry ${filename} is missing.`)
      }
      const text = await entry.getData(new TextWriter())
      try {
        return JSON.parse(text) as unknown
      } catch {
        throw new Error(`ZIP entry ${filename} is not valid JSON.`)
      }
    }
    const manifest = await readJsonEntry('manifest.json')
    const tables = Object.fromEntries(
      await Promise.all(
        tableNames.map(async (tableName) => [
          tableName,
          await readJsonEntry(`tables/${tableName}.json`),
        ]),
      ),
    ) as Record<TableName, unknown>
    const mediaPackage = {
      manifest,
      ...tables,
    } as unknown

    const validated = validateMediaExportPackage(mediaPackage)
    const sourceImages: SourceImage[] = []
    for (const image of validated.sourceImages) {
      const entry = entryByName.get(image.mediaPath)
      if (!entry) {
        throw new Error(`Media file ${image.mediaPath} is missing.`)
      }
      const imageBlob = await entry.getData(new BlobWriter(image.mimeType))
      if (imageBlob.size !== image.sizeBytes) {
        throw new Error(`Media file ${image.mediaPath} has an invalid size.`)
      }
      sourceImages.push({
        id: image.id,
        deckId: image.deckId,
        lessonId: image.lessonId,
        fileName: image.fileName,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        blob: imageBlob,
        width: image.width,
        height: image.height,
        ocrStatus: image.ocrStatus,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
        archivedAt: image.archivedAt,
      })
    }

    return { ...validated, sourceImages }
  } finally {
    await reader.close()
  }
}

export function validateMediaExportPackage(
  value: unknown,
): MediaExportPackageV2 {
  if (!isRecord(value) || !isRecord(value.manifest)) {
    throw new Error('The media backup manifest is missing.')
  }
  const manifest = value.manifest
  if (
    manifest.appName !== 'LexiDeck' ||
    manifest.exportVersion !== 2 ||
    manifest.dataVersion !== 4 ||
    manifest.mediaIncluded !== true ||
    typeof manifest.appVersion !== 'string' ||
    typeof manifest.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(manifest.exportedAt))
  ) {
    throw new Error('The media backup manifest is invalid or unsupported.')
  }

  for (const tableName of tableNames) {
    if (!Array.isArray(value[tableName])) {
      throw new Error(`The required ${tableName} table is missing.`)
    }
  }

  const coreValidation = validateImportBundle({
    manifest: {
      ...manifest,
      exportVersion: 1,
      dataVersion: 1,
      mediaIncluded: false,
    },
    decks: value.decks,
    lessons: value.lessons,
    cards: value.cards,
    reviewStates: value.reviewStates,
    reviewLogs: value.reviewLogs,
    settings: value.settings,
    knownWords: value.knownWords,
  })
  if (!coreValidation.valid) {
    throw new Error(coreValidation.errors.join(' '))
  }

  const sourceImages = value.sourceImages as unknown[]
  const imageIds = new Set<string>()
  for (const [index, rawImage] of sourceImages.entries()) {
    if (!isSourceImageRecord(rawImage)) {
      throw new Error(`sourceImages[${index}] is invalid.`)
    }
    if (imageIds.has(rawImage.id)) {
      throw new Error(`sourceImages[${index}].id is duplicated.`)
    }
    imageIds.add(rawImage.id)
  }

  const lessonIds = new Set(coreValidation.bundle.lessons.map((lesson) => lesson.id))
  const deckIds = new Set(coreValidation.bundle.decks.map((deck) => deck.id))
  const lessonById = new Map(
    coreValidation.bundle.lessons.map((lesson) => [lesson.id, lesson]),
  )
  for (const [index, image] of (
    sourceImages as SourceImageExportRecord[]
  ).entries()) {
    const lesson = lessonById.get(image.lessonId)
    if (
      !deckIds.has(image.deckId) ||
      !lessonIds.has(image.lessonId) ||
      lesson?.deckId !== image.deckId
    ) {
      throw new Error(`sourceImages[${index}].lessonId is invalid.`)
    }
  }
  for (const [index, card] of coreValidation.bundle.cards.entries()) {
    if (card.frontImageId && !imageIds.has(card.frontImageId)) {
      throw new Error(`cards[${index}].frontImageId is invalid.`)
    }
  }
  const sourceImageById = new Map(
    (sourceImages as SourceImageExportRecord[]).map((image) => [image.id, image]),
  )

  const ocrTextIds = new Set<string>()
  const ocrSourceImageIds = new Set<string>()
  for (const [index, rawOcrText] of (
    value.ocrTexts as unknown[]
  ).entries()) {
    if (
      !isRecord(rawOcrText) ||
      typeof rawOcrText.id !== 'string' ||
      typeof rawOcrText.sourceImageId !== 'string' ||
      !imageIds.has(rawOcrText.sourceImageId) ||
      typeof rawOcrText.rawText !== 'string' ||
      typeof rawOcrText.normalizedText !== 'string' ||
      rawOcrText.provider !== 'mock' ||
      typeof rawOcrText.confidence !== 'number' ||
      !isIsoString(rawOcrText.createdAt) ||
      !isIsoString(rawOcrText.updatedAt)
    ) {
      throw new Error(`ocrTexts[${index}] is invalid.`)
    }
    if (
      ocrTextIds.has(rawOcrText.id) ||
      ocrSourceImageIds.has(rawOcrText.sourceImageId)
    ) {
      throw new Error(`ocrTexts[${index}].id is duplicated.`)
    }
    ocrTextIds.add(rawOcrText.id)
    ocrSourceImageIds.add(rawOcrText.sourceImageId)
  }

  const candidateIds = new Set<string>()
  for (const [index, rawCandidate] of (
    value.vocabularyCandidates as unknown[]
  ).entries()) {
    const sourceImage =
      isRecord(rawCandidate) && typeof rawCandidate.sourceImageId === 'string'
        ? sourceImageById.get(rawCandidate.sourceImageId)
        : undefined
    if (
      !isRecord(rawCandidate) ||
      typeof rawCandidate.id !== 'string' ||
      typeof rawCandidate.sourceImageId !== 'string' ||
      !imageIds.has(rawCandidate.sourceImageId) ||
      typeof rawCandidate.ocrTextId !== 'string' ||
      !ocrTextIds.has(rawCandidate.ocrTextId) ||
      typeof rawCandidate.deckId !== 'string' ||
      typeof rawCandidate.lessonId !== 'string' ||
      sourceImage?.deckId !== rawCandidate.deckId ||
      sourceImage?.lessonId !== rawCandidate.lessonId ||
      typeof rawCandidate.rawText !== 'string' ||
      typeof rawCandidate.normalizedText !== 'string' ||
      !['word', 'expression'].includes(String(rawCandidate.candidateType)) ||
      !['de', 'het', 'none', 'unknown'].includes(String(rawCandidate.article)) ||
      typeof rawCandidate.myLanguageMeaning !== 'string' ||
      !['pending', 'approved', 'rejected', 'known', 'converted'].includes(
        String(rawCandidate.status),
      ) ||
      ![
        'unique',
        'duplicateInDeck',
        'possibleDuplicate',
        'duplicateCandidate',
        'known',
      ].includes(String(rawCandidate.duplicateStatus)) ||
      !isIsoString(rawCandidate.createdAt) ||
      !isIsoString(rawCandidate.updatedAt)
    ) {
      throw new Error(`vocabularyCandidates[${index}] is invalid.`)
    }
    if (candidateIds.has(rawCandidate.id)) {
      throw new Error(`vocabularyCandidates[${index}].id is duplicated.`)
    }
    candidateIds.add(rawCandidate.id)
  }

  return value as MediaExportPackageV2
}

export function createMediaBackupFilename(exportedAt: string): string {
  const date = new Date(exportedAt)
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    'lexideck-media-backup',
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `-${pad(date.getHours())}-${pad(date.getMinutes())}.zip`
}

function isSourceImageRecord(value: unknown): value is SourceImageExportRecord {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.deckId === 'string' &&
    typeof value.lessonId === 'string' &&
    typeof value.fileName === 'string' &&
    typeof value.mimeType === 'string' &&
    value.mimeType.startsWith('image/') &&
    typeof value.sizeBytes === 'number' &&
    Number.isInteger(value.sizeBytes) &&
    value.sizeBytes >= 0 &&
    typeof value.width === 'number' &&
    Number.isInteger(value.width) &&
    value.width > 0 &&
    typeof value.height === 'number' &&
    Number.isInteger(value.height) &&
    value.height > 0 &&
    ['notStarted', 'pending', 'complete', 'failed'].includes(
      String(value.ocrStatus),
    ) &&
    isIsoString(value.createdAt) &&
    isIsoString(value.updatedAt) &&
    (value.archivedAt === undefined || isIsoString(value.archivedAt)) &&
    typeof value.mediaPath === 'string' &&
    value.mediaPath === `media/source-images/${value.id}.blob`
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}
