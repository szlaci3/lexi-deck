import { normalizeOcrText } from '../../domain/ocr/normalizeOcrText'
import { runMockOcr } from '../../domain/ocr/ocrService'
import type { OcrText } from '../../domain/ocr/ocrTypes'
import { nowIso } from '../../utils/dates'
import { createId } from '../../utils/ids'
import { db } from '../dexie'
import { SourceImageNotFoundError } from './sourceImageRepository'

export class OcrTextNotFoundError extends Error {
  constructor() {
    super('The OCR text for this image could not be found.')
    this.name = 'OcrTextNotFoundError'
  }
}

export async function getOcrTextBySourceImageId(
  sourceImageId: string,
): Promise<OcrText | undefined> {
  return db.ocrTexts.where('sourceImageId').equals(sourceImageId).first()
}

export async function runOcrForSourceImage(
  sourceImageId: string,
  testText?: string,
): Promise<OcrText> {
  const sourceImage = await db.sourceImages.get(sourceImageId)

  if (!sourceImage || sourceImage.archivedAt) {
    throw new SourceImageNotFoundError()
  }

  const pendingAt = nowIso()
  await db.sourceImages.put({
    ...sourceImage,
    ocrStatus: 'pending',
    updatedAt: pendingAt,
  })

  try {
    const result = await runMockOcr(sourceImage, testText)
    const rawText = result.rawText.trim()
    const normalizedText = normalizeOcrText(rawText)

    if (!normalizedText) {
      throw new Error('Mock OCR did not return any text.')
    }

    const existing = await getOcrTextBySourceImageId(sourceImageId)
    const completedAt = nowIso()
    const ocrText: OcrText = {
      id: existing?.id ?? createId(),
      sourceImageId,
      rawText,
      normalizedText,
      provider: result.provider,
      confidence: result.confidence,
      createdAt: existing?.createdAt ?? completedAt,
      updatedAt: completedAt,
    }

    await db.transaction('rw', db.sourceImages, db.ocrTexts, async () => {
      await db.ocrTexts.put(ocrText)
      await db.sourceImages.put({
        ...sourceImage,
        ocrStatus: 'complete',
        updatedAt: completedAt,
      })
    })

    return ocrText
  } catch (error: unknown) {
    await db.sourceImages.put({
      ...sourceImage,
      ocrStatus: 'failed',
      updatedAt: nowIso(),
    })
    throw error
  }
}

export async function updateOcrText(
  sourceImageId: string,
  rawText: string,
): Promise<OcrText> {
  const [sourceImage, existing] = await Promise.all([
    db.sourceImages.get(sourceImageId),
    getOcrTextBySourceImageId(sourceImageId),
  ])

  if (!sourceImage || sourceImage.archivedAt) {
    throw new SourceImageNotFoundError()
  }
  if (!existing) {
    throw new OcrTextNotFoundError()
  }

  const normalizedText = normalizeOcrText(rawText)
  if (!normalizedText) {
    throw new Error('OCR text cannot be empty.')
  }

  const timestamp = nowIso()
  const updated: OcrText = {
    ...existing,
    rawText: rawText.trim(),
    normalizedText,
    updatedAt: timestamp,
  }

  await db.transaction('rw', db.sourceImages, db.ocrTexts, async () => {
    await db.ocrTexts.put(updated)
    await db.sourceImages.put({
      ...sourceImage,
      ocrStatus: 'complete',
      updatedAt: timestamp,
    })
  })

  return updated
}
