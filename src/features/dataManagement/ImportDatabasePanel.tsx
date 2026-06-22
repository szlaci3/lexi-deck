import { useState, type ChangeEvent } from 'react'
import {
  exportDatabaseJson,
  replaceDatabase,
} from '../../db/repositories/importExportRepository'
import { createExportFilename } from '../../domain/importExport/exportDatabase'
import type {
  ExportBundleV1,
  ImportSummary,
} from '../../domain/importExport/exportTypes'
import { downloadTextFile } from '../../utils/download'
import { ImportPreview } from './ImportPreview'
import { readImportFile } from './dataFile'
import styles from './DataPanel.module.css'

type SafetyStatus = 'pending' | 'downloaded' | 'skipped'

export function ImportDatabasePanel() {
  const [bundle, setBundle] = useState<ExportBundleV1>()
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus>('pending')
  const [confirmed, setConfirmed] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [summary, setSummary] = useState<ImportSummary>()
  const [error, setError] = useState('')

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setError('')
    setSummary(undefined)
    setSafetyStatus('pending')
    setConfirmed(false)

    try {
      setBundle(await readImportFile(file))
    } catch (fileError: unknown) {
      setBundle(undefined)
      setError(
        fileError instanceof Error
          ? fileError.message
          : 'The import file could not be read.',
      )
    } finally {
      event.target.value = ''
    }
  }

  async function downloadSafetyExport() {
    setIsWorking(true)
    setError('')
    try {
      const { bundle: safetyBundle, json } = await exportDatabaseJson()
      downloadTextFile(
        json,
        createExportFilename(safetyBundle.manifest.exportedAt),
      )
      setSafetyStatus('downloaded')
    } catch (safetyError: unknown) {
      setError(
        safetyError instanceof Error
          ? safetyError.message
          : 'The safety export could not be downloaded.',
      )
    } finally {
      setIsWorking(false)
    }
  }

  async function importDatabase() {
    if (!bundle || safetyStatus === 'pending' || !confirmed) {
      return
    }
    if (
      !window.confirm(
        'Import Database will permanently replace all current local data. Continue?',
      )
    ) {
      return
    }

    setIsWorking(true)
    setError('')
    try {
      setSummary(await replaceDatabase(bundle))
      setBundle(undefined)
      setConfirmed(false)
      setSafetyStatus('pending')
    } catch (importError: unknown) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'The database could not be imported.',
      )
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section className={`${styles.panel} ${styles.dangerPanel}`}>
      <div className={styles.heading}>
        <span>2</span>
        <div>
          <h2>Import Database</h2>
          <p>Restore a backup by replacing every record currently in LexiDeck.</p>
        </div>
      </div>
      <label className={styles.fileButton}>
        Choose backup file
        <input type="file" accept="application/json,.json" onChange={selectFile} />
      </label>
      <p className={styles.error}>
        Export v1 excludes media. Replacing the database will also remove
        locally stored source images, and the safety export cannot restore them.
      </p>

      {bundle ? (
        <div className={styles.flow}>
          <ImportPreview bundle={bundle} />
          <div className={styles.safetyStep}>
            <strong>Safety export required</strong>
            <p>
              Download the current database first, or explicitly skip this
              protection.
            </p>
            <div className={styles.buttonRow}>
              <button
                type="button"
                disabled={isWorking}
                onClick={() => void downloadSafetyExport()}
              >
                Download Safety Export
              </button>
              <button
                type="button"
                onClick={() => setSafetyStatus('skipped')}
              >
                Skip Safety Export
              </button>
            </div>
            {safetyStatus !== 'pending' ? (
              <small>
                Safety step: {safetyStatus === 'downloaded' ? 'downloaded' : 'skipped'}.
              </small>
            ) : null}
          </div>
          <label className={styles.confirmation}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I understand that current decks, cards, and review progress will
              be replaced.
            </span>
          </label>
          <button
            className={styles.dangerButton}
            type="button"
            disabled={
              isWorking || safetyStatus === 'pending' || !confirmed
            }
            onClick={() => void importDatabase()}
          >
            {isWorking ? 'Importing…' : 'Import Database'}
          </button>
        </div>
      ) : null}

      {summary ? (
        <p className={styles.success}>
          Import complete: {summary.decks} decks, {summary.cards} cards, and{' '}
          {summary.reviewLogs} review logs restored.
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
