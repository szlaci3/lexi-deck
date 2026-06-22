import { useState } from 'react'
import { exportDatabaseJson } from '../../db/repositories/importExportRepository'
import { createExportFilename } from '../../domain/importExport/exportDatabase'
import { downloadTextFile } from '../../utils/download'
import styles from './DataPanel.module.css'

export function ExportDatabasePanel() {
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleExport() {
    setIsExporting(true)
    setMessage('')
    setError('')

    try {
      const { bundle, json } = await exportDatabaseJson()
      downloadTextFile(json, createExportFilename(bundle.manifest.exportedAt))
      setMessage('Database export downloaded.')
    } catch (exportError: unknown) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'The database could not be exported.',
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <span>1</span>
        <div>
          <h2>Export Database</h2>
          <p>Download a complete JSON backup of all structured LexiDeck data.</p>
        </div>
      </div>
      <p className={styles.note}>Export v1 does not include image or audio media.</p>
      {message ? <p className={styles.success}>{message}</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button
        className={styles.primaryButton}
        type="button"
        disabled={isExporting}
        onClick={() => void handleExport()}
      >
        {isExporting ? 'Exporting…' : 'Export Database'}
      </button>
    </section>
  )
}
