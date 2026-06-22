import { createImportPreview } from '../../domain/importExport/exportDatabase'
import type { ExportBundleV1 } from '../../domain/importExport/exportTypes'
import styles from './ImportPreview.module.css'

type ImportPreviewProps = {
  bundle: ExportBundleV1
}

export function ImportPreview({ bundle }: ImportPreviewProps) {
  const preview = createImportPreview(bundle)

  return (
    <div className={styles.preview}>
      <div>
        <span>Exported</span>
        <strong>{new Date(preview.exportedAt).toLocaleString()}</strong>
      </div>
      <div>
        <span>Export version</span>
        <strong>{preview.exportVersion}</strong>
      </div>
      <div>
        <span>Media included</span>
        <strong>{preview.mediaIncluded ? 'Yes' : 'No'}</strong>
      </div>
      <div>
        <span>Decks</span>
        <strong>{preview.deckCount}</strong>
      </div>
      <div>
        <span>Lessons</span>
        <strong>{preview.lessonCount}</strong>
      </div>
      <div>
        <span>Cards</span>
        <strong>{preview.cardCount}</strong>
      </div>
      <div>
        <span>Review states</span>
        <strong>{preview.reviewStateCount}</strong>
      </div>
      <div>
        <span>Review logs</span>
        <strong>{preview.reviewLogCount}</strong>
      </div>
    </div>
  )
}
