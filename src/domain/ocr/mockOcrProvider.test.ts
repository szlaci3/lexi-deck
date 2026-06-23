import { describe, expect, it } from 'vitest'
import type { SourceImage } from '../media/mediaTypes'
import { MOCK_OCR_DEMO_TEXT, MockOcrProvider } from './mockOcrProvider'

const sourceImage = {
  id: 'image-1',
  deckId: 'deck-1',
  lessonId: 'lesson-1',
  fileName: 'page.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 10,
  blob: new Blob(),
  width: 100,
  height: 200,
  ocrStatus: 'notStarted',
  createdAt: '2026-06-23T10:00:00.000Z',
  updatedAt: '2026-06-23T10:00:00.000Z',
} satisfies SourceImage

describe('MockOcrProvider', () => {
  it('returns deterministic demo text by default', async () => {
    const result = await new MockOcrProvider().recognize({ sourceImage })
    expect(result.rawText).toBe(MOCK_OCR_DEMO_TEXT)
    expect(result.provider).toBe('mock')
  })

  it('uses supplied test text when present', async () => {
    const result = await new MockOcrProvider().recognize({
      sourceImage,
      testText: '  de fiets  ',
    })
    expect(result.rawText).toBe('de fiets')
  })
})
