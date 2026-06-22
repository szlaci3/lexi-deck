import { useState, type ChangeEvent } from 'react'
import { createSourceImage } from '../../db/repositories/sourceImageRepository'
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
    if (files.length === 0) {
      return
    }

    setIsUploading(true)
    setError('')
    const uploaded: SourceImage[] = []

    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Optimizing image ${index + 1} of ${files.length}…`)
        const optimizedImage = await optimizeSourceImage(file)
        setProgress(`Saving image ${index + 1} of ${files.length}…`)
        uploaded.push(
          await createSourceImage(deckId, lessonId, optimizedImage),
        )
      }
      setProgress(
        `${uploaded.length} ${uploaded.length === 1 ? 'image' : 'images'} added.`,
      )
      onUploaded(uploaded)
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The image could not be uploaded.',
      )
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
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
        are not kept.
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
