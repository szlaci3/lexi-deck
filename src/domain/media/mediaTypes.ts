export type OcrStatus = 'notStarted' | 'pending' | 'complete' | 'failed'

export type SourceImage = {
  id: string
  deckId: string
  lessonId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  blob: Blob
  width: number
  height: number
  ocrStatus: OcrStatus
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export type OptimizedImage = Pick<
  SourceImage,
  'fileName' | 'mimeType' | 'sizeBytes' | 'blob' | 'width' | 'height'
>
