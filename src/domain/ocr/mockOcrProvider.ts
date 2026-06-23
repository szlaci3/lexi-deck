import type { OcrProvider } from './ocrProvider'
import type { OcrRequest, OcrResult } from './ocrTypes'

export const MOCK_OCR_DEMO_TEXT = [
  'de komkommer — cucumber',
  'het huis — house',
  'ik heb dorst — I am thirsty',
].join('\n')

export class MockOcrProvider implements OcrProvider {
  async recognize({ testText }: OcrRequest): Promise<OcrResult> {
    return {
      rawText: testText?.trim() || MOCK_OCR_DEMO_TEXT,
      provider: 'mock',
      confidence: 1,
    }
  }
}
