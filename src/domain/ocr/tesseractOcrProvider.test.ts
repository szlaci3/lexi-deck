import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourceImage } from '../media/mediaTypes'
import { TesseractOcrProvider } from './tesseractOcrProvider'

const mocks = vi.hoisted(() => ({
  terminate: vi.fn(),
  recognize: vi.fn(),
  createWorker: vi.fn(),
}))

vi.mock('tesseract.js', () => ({
  createWorker: mocks.createWorker,
  OEM: { LSTM_ONLY: 1 },
}))

const sourceImage = {
  id: 'image-1',
  deckId: 'deck-1',
  lessonId: 'lesson-1',
  fileName: 'page.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 10,
  blob: new Blob(['image'], { type: 'image/jpeg' }),
  width: 100,
  height: 200,
  ocrStatus: 'notStarted',
  createdAt: '2026-06-23T10:00:00.000Z',
  updatedAt: '2026-06-23T10:00:00.000Z',
} satisfies SourceImage

describe('TesseractOcrProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('Worker', class Worker {})
    mocks.createWorker.mockResolvedValue({
      recognize: mocks.recognize,
      terminate: mocks.terminate,
    })
    mocks.recognize.mockResolvedValue({
      data: { text: 'de fiets', confidence: 87 },
    })
  })

  it('recognizes the source image blob with the Dutch model', async () => {
    const result = await new TesseractOcrProvider().recognize({ sourceImage })

    expect(mocks.createWorker).toHaveBeenCalledWith(
      'nld',
      1,
      expect.objectContaining({ logger: expect.any(Function) }),
    )
    expect(mocks.recognize).toHaveBeenCalledWith(sourceImage.blob)
    expect(result).toEqual({
      rawText: 'de fiets',
      provider: 'tesseract',
      confidence: 0.87,
    })
    expect(mocks.terminate).toHaveBeenCalledOnce()
  })

  it('reports a useful error and terminates the worker on failure', async () => {
    mocks.recognize.mockRejectedValue(new Error('worker stopped'))

    await expect(
      new TesseractOcrProvider().recognize({ sourceImage }),
    ).rejects.toThrow('Dutch OCR failed: worker stopped')
    expect(mocks.terminate).toHaveBeenCalledOnce()
  })
})
