import type { SourceImage } from '../media/mediaTypes'

export type OcrProviderName = 'mock' | 'tesseract'

export type OcrText = {
  id: string
  sourceImageId: string
  rawText: string
  normalizedText: string
  provider: OcrProviderName
  confidence: number
  createdAt: string
  updatedAt: string
}

export type OcrRequest = {
  sourceImage: SourceImage
}

export type OcrResult = {
  rawText: string
  provider: OcrProviderName
  confidence: number
}

export type OcrProgress = {
  status: string
  progress: number
}

export type OcrProgressHandler = (progress: OcrProgress) => void
