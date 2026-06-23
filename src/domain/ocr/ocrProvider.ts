import type { OcrRequest, OcrResult } from './ocrTypes'

export interface OcrProvider {
  recognize(request: OcrRequest): Promise<OcrResult>
}
