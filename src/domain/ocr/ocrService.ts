import type { SourceImage } from '../media/mediaTypes'
import type { OcrProvider } from './ocrProvider'
import type { OcrProgressHandler, OcrResult } from './ocrTypes'
import { TesseractOcrProvider } from './tesseractOcrProvider'

const provider: OcrProvider = new TesseractOcrProvider()

export function runOcr(
  sourceImage: SourceImage,
  onProgress?: OcrProgressHandler,
): Promise<OcrResult> {
  return provider.recognize({ sourceImage }, onProgress)
}
