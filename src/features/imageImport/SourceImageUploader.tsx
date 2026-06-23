import { useState, type ChangeEvent } from 'react'
import { runOcrForSourceImage } from '../../db/repositories/ocrRepository'
import {
  createSourceImage,
  getSourceImageById,
} from '../../db/repositories/sourceImageRepository'
import { optimizeSourceImage } from '../../domain/media/imageProcessing'
import type { SourceImage } from '../../domain/media/mediaTypes'
import styles from './SourceImageUploader.module.css'

type SourceImageUploaderProps = {
  deckId: string
  lessonId: string
  onUploaded: (images: SourceImage[]) => void
}

export function SourceImageUploader({
  deckId,
  lessonId,
  onUploaded,
}: SourceImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    setIsUploading(true)
    setProgress('')
    setError('')
    const uploaded: SourceImage[] = []
    const errors: string[] = []

    for (const [index, file] of files.entries()) {
      let sourceImage: SourceImage | undefined
      try {
        setProgress(`Optimizing image ${index + 1} of ${files.length}…`)
        const optimizedImage = await optimizeSourceImage(file)
        setProgress(`Saving image ${index + 1} of ${files.length}…`)
        sourceImage = await createSourceImage(
          deckId,
          lessonId,
          optimizedImage,
        )
        await runOcrForSourceImage(sourceImage.id, ({ status, progress }) => {
          setProgress(
            `Reading image ${index + 1} of ${files.length}: ${status} ${Math.round(progress * 100)}%`,
          )
        })
      } catch (uploadError: unknown) {
        errors.push(
          `${file.name}: ${
            uploadError instanceof Error
              ? uploadError.message
              : 'The image could not be processed.'
          }`,
        )
      }

      if (sourceImage) {
        uploaded.push(
          (await getSourceImageById(sourceImage.id)) ?? sourceImage,
        )
      }
    }

    setProgress(
      `${uploaded.length} ${uploaded.length === 1 ? 'image' : 'images'} added and processed.`,
    )
    setError(errors.join(' '))
    onUploaded(uploaded)
    setIsUploading(false)
    event.target.value = ''
  }

  return (
    <div className={styles.uploader}>
      <label className={styles.uploadButton}>
        {isUploading ? 'Processing…' : 'Add page photos'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          disabled={isUploading}
          onChange={(event) => void uploadImages(event)}
        />
      </label>
      <p>
        Large photos are resized before storage. Original full-resolution files
        are not kept. Dutch OCR runs locally in your browser after upload.
      </p>
      {progress ? (
        <small className={styles.progress} role="status">
          {progress}
        </small>
      ) : null}
      {error ? (
        <small className={styles.error} role="alert">
          {error}
        </small>
      ) : null}
    </div>
  )
}
