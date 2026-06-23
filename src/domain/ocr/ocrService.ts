import type { SourceImage } from '../media/mediaTypes'
import { MockOcrProvider } from './mockOcrProvider'
import type { OcrProvider } from './ocrProvider'
import type { OcrResult } from './ocrTypes'

const provider: OcrProvider = new MockOcrProvider()

export function runMockOcr(
  sourceImage: SourceImage,
  testText?: string,
): Promise<OcrResult> {
  return provider.recognize({ sourceImage, testText })
}
