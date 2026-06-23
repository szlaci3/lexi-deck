import type { SourceImage } from '../media/mediaTypes'

export type OcrProviderName = 'mock'

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
  testText?: string
}

export type OcrResult = {
  rawText: string
  provider: OcrProviderName
  confidence: number
}
