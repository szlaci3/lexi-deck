import { useState } from 'react'
import { Link } from 'react-router-dom'
import { archiveSourceImage } from '../../db/repositories/sourceImageRepository'
import type { SourceImage } from '../../domain/media/mediaTypes'
import { useBlobUrl } from '../../hooks/useBlobUrl'
import styles from './SourceImageGallery.module.css'

type SourceImageGalleryProps = {
  images: SourceImage[]
  onArchived: (id: string) => void
}

export function SourceImageGallery({
  images,
  onArchived,
}: SourceImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<SourceImage>()
  const [error, setError] = useState('')

  async function confirmArchive(image: SourceImage) {
    if (!window.confirm(`Archive “${image.fileName}”?`)) {
      return
    }

    setError('')
    try {
      await archiveSourceImage(image.id)
      if (selectedImage?.id === image.id) {
        setSelectedImage(undefined)
      }
      onArchived(image.id)
    } catch (archiveError: unknown) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : 'The image could not be archived.',
      )
    }
  }

  if (images.length === 0) {
    return (
      <div className={styles.emptyState}>
        <strong>No page photos yet</strong>
        <p>Add optimized textbook images to prepare this lesson for OCR.</p>
      </div>
    )
  }

  return (
    <div className={styles.galleryArea}>
      {selectedImage ? (
        <SourceImageDetail
          image={selectedImage}
          onClose={() => setSelectedImage(undefined)}
          onArchive={() => void confirmArchive(selectedImage)}
        />
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.grid}>
        {images.map((image) => (
          <SourceImageItem
            key={image.id}
            image={image}
            onOpen={() => setSelectedImage(image)}
            onArchive={() => void confirmArchive(image)}
          />
        ))}
      </div>
    </div>
  )
}

type SourceImageItemProps = {
  image: SourceImage
  onOpen: () => void
  onArchive: () => void
}

function SourceImageItem({
  image,
  onOpen,
  onArchive,
}: SourceImageItemProps) {
  const url = useBlobUrl(image.blob)

  return (
    <article className={styles.item}>
      <button className={styles.thumbnailButton} type="button" onClick={onOpen}>
        {url ? (
          <img
            src={url}
            alt={`Textbook page ${image.fileName}`}
            loading="lazy"
          />
        ) : null}
      </button>
      <div className={styles.itemInfo}>
        <strong>{image.fileName}</strong>
        <span>
          {image.width} × {image.height} · {formatBytes(image.sizeBytes)}
        </span>
        <span>OCR: {formatOcrStatus(image.ocrStatus)}</span>
      </div>
      <div className={styles.itemActions}>
        <button type="button" onClick={onOpen}>
          View
        </button>
        <Link
          to={`/decks/${image.deckId}/lessons/${image.lessonId}/images/${image.id}/ocr`}
        >
          {image.ocrStatus === 'complete' ? 'Review OCR' : 'Run OCR'}
        </Link>
        <Link
          to={`/decks/${image.deckId}/cards?lessonId=${image.lessonId}&imageId=${image.id}&createImage=1`}
        >
          Create card
        </Link>
        <button className={styles.archiveButton} type="button" onClick={onArchive}>
          Archive
        </button>
      </div>
    </article>
  )
}

type SourceImageDetailProps = {
  image: SourceImage
  onClose: () => void
  onArchive: () => void
}

function SourceImageDetail({
  image,
  onClose,
  onArchive,
}: SourceImageDetailProps) {
  const url = useBlobUrl(image.blob)

  return (
    <section
      className={styles.detail}
      role="region"
      aria-labelledby="source-image-detail-title"
    >
      <div className={styles.detailHeading}>
        <div>
          <p>Source image</p>
          <h3 id="source-image-detail-title">{image.fileName}</h3>
        </div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {url ? <img src={url} alt={`Textbook page ${image.fileName}`} /> : null}
      <dl>
        <div>
          <dt>Dimensions</dt>
          <dd>
            {image.width} × {image.height}
          </dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatBytes(image.sizeBytes)}</dd>
        </div>
        <div>
          <dt>OCR status</dt>
          <dd>{formatOcrStatus(image.ocrStatus)}</dd>
        </div>
        <div>
          <dt>Added</dt>
          <dd>{new Date(image.createdAt).toLocaleString()}</dd>
        </div>
      </dl>
      <Link
        className={styles.ocrButton}
        to={`/decks/${image.deckId}/lessons/${image.lessonId}/images/${image.id}/ocr`}
      >
        {image.ocrStatus === 'complete' ? 'Review OCR text' : 'Run mock OCR'}
      </Link>
      <Link
        className={styles.cardButton}
        to={`/decks/${image.deckId}/cards?lessonId=${image.lessonId}&imageId=${image.id}&createImage=1`}
      >
        Create image card
      </Link>
      <button className={styles.detailArchiveButton} type="button" onClick={onArchive}>
        Archive image
      </button>
    </section>
  )
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatOcrStatus(status: SourceImage['ocrStatus']): string {
  const labels: Record<SourceImage['ocrStatus'], string> = {
    notStarted: 'Not started',
    pending: 'Pending',
    complete: 'Complete',
    failed: 'Failed',
  }
  return labels[status]
}
