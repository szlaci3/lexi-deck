import type {
  OcrProgressHandler,
  OcrRequest,
  OcrResult,
} from './ocrTypes'

export interface OcrProvider {
  recognize(
    request: OcrRequest,
    onProgress?: OcrProgressHandler,
  ): Promise<OcrResult>
}
