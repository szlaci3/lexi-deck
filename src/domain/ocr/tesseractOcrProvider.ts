import type { OcrProvider } from './ocrProvider'
import type {
  OcrProgressHandler,
  OcrRequest,
  OcrResult,
} from './ocrTypes'

const dutchLanguageCode = 'nld'

export class TesseractOcrProvider implements OcrProvider {
  async recognize(
    { sourceImage }: OcrRequest,
    onProgress?: OcrProgressHandler,
  ): Promise<OcrResult> {
    if (
      typeof Worker === 'undefined' ||
      typeof WebAssembly === 'undefined'
    ) {
      throw new Error(
        'OCR is unavailable because this browser does not support Web Workers and WebAssembly.',
      )
    }

    onProgress?.({ status: 'Loading OCR engine', progress: 0 })
    try {
      const { createWorker, OEM } = await import('tesseract.js')
      const worker = await createWorker(dutchLanguageCode, OEM.LSTM_ONLY, {
        logger: (message) =>
          onProgress?.({
            status: formatTesseractStatus(message.status),
            progress: clampProgress(message.progress),
          }),
      })

      try {
        const result = await worker.recognize(sourceImage.blob)
        return {
          rawText: result.data.text,
          provider: 'tesseract',
          confidence: clampProgress(result.data.confidence / 100),
        }
      } finally {
        await worker.terminate()
      }
    } catch (error: unknown) {
      throw new Error(
        error instanceof Error
          ? `Dutch OCR failed: ${error.message}`
          : 'Dutch OCR failed while reading this image.',
        { cause: error },
      )
    }
  }
}

function formatTesseractStatus(status: string): string {
  return status
    .split(/\s+/u)
    .filter(Boolean)
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(' ')
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(1, Math.max(0, progress))
}
