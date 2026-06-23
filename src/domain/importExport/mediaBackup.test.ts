import { describe, expect, it } from 'vitest'
import type { MediaExportPackageV2 } from './mediaExportTypes'
import {
  createMediaBackupFilename,
  createMediaBackupZip,
  readMediaBackupZip,
  validateMediaExportPackage,
} from './mediaBackup'

const timestamp = '2026-06-23T10:00:00.000Z'

function mediaPackage(): MediaExportPackageV2 {
  return {
    manifest: {
      appName: 'LexiDeck',
      appVersion: '0.9.0',
      exportVersion: 2,
      exportedAt: timestamp,
      dataVersion: 4,
      mediaIncluded: true,
    },
    decks: [
      {
        id: 'deck-1',
        name: 'Dutch',
        description: 'Course',
        myLanguage: 'en',
        targetLanguage: 'nl',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    lessons: [
      {
        id: 'lesson-1',
        deckId: 'deck-1',
        title: 'Lesson',
        description: 'Description',
        order: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    cards: [],
    reviewStates: [],
    reviewLogs: [],
    settings: [],
    knownWords: [],
    sourceImages: [
      {
        id: 'image-1',
        deckId: 'deck-1',
        lessonId: 'lesson-1',
        fileName: 'page.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4,
        width: 100,
        height: 200,
        ocrStatus: 'complete',
        createdAt: timestamp,
        updatedAt: timestamp,
        mediaPath: 'media/source-images/image-1.blob',
      },
    ],
    ocrTexts: [
      {
        id: 'ocr-1',
        sourceImageId: 'image-1',
        rawText: 'de fiets',
        normalizedText: 'de fiets',
        provider: 'tesseract',
        confidence: 0.87,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    vocabularyCandidates: [],
  }
}

describe('media backup v2', () => {
  it('round-trips metadata and source-image blobs through ZIP', async () => {
    const source = mediaPackage()
    const blob = await createMediaBackupZip(
      source,
      new Map([['image-1', new Blob(['page'], { type: 'image/jpeg' })]]),
    )
    const restored = await readMediaBackupZip(blob)

    expect(restored.manifest.exportVersion).toBe(2)
    expect(restored.sourceImages[0]?.blob.size).toBe(4)
    expect(await restored.sourceImages[0]?.blob.text()).toBe('page')
    expect(restored.ocrTexts[0]?.provider).toBe('tesseract')
  })

  it('rejects unsafe media paths', () => {
    const source = mediaPackage()
    source.sourceImages[0]!.mediaPath = '../image.jpg'
    expect(() => validateMediaExportPackage(source)).toThrow(
      'sourceImages[0] is invalid.',
    )
  })

  it('creates timestamped ZIP filenames', () => {
    expect(createMediaBackupFilename('2026-06-23T10:00:00')).toBe(
      'lexideck-media-backup-2026-06-23-10-00.zip',
    )
  })
})
