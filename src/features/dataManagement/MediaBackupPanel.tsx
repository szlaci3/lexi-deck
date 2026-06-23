import { useState, type ChangeEvent } from 'react'
import {
  exportMediaBackup,
  replaceDatabaseWithMedia,
} from '../../db/repositories/importExportRepository'
import {
  createMediaBackupFilename,
  readMediaBackupZip,
} from '../../domain/importExport/mediaBackup'
import type { MediaImportSummary } from '../../domain/importExport/exportTypes'
import type { RestoredMediaPackageV2 } from '../../domain/importExport/mediaExportTypes'
import { downloadBlob } from '../../utils/download'
import styles from './DataPanel.module.css'

type SafetyStatus = 'pending' | 'downloaded' | 'skipped'

export function MediaBackupPanel() {
  const [restoredPackage, setRestoredPackage] =
    useState<RestoredMediaPackageV2>()
  const [safetyStatus, setSafetyStatus] =
    useState<SafetyStatus>('pending')
  const [confirmed, setConfirmed] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [summary, setSummary] = useState<MediaImportSummary>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function exportZip(isSafetyExport = false) {
    setIsWorking(true)
    setError('')
    setMessage('')
    try {
      const { mediaPackage, blob } = await exportMediaBackup()
      downloadBlob(blob, createMediaBackupFilename(mediaPackage.manifest.exportedAt))
      if (isSafetyExport) {
        setSafetyStatus('downloaded')
      } else {
        setMessage('Media backup downloaded.')
      }
    } catch (exportError: unknown) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'The media backup could not be created.',
      )
    } finally {
      setIsWorking(false)
    }
  }

  async function selectZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsWorking(true)
    setError('')
    setMessage('')
    setSummary(undefined)
    setSafetyStatus('pending')
    setConfirmed(false)
    try {
      setRestoredPackage(await readMediaBackupZip(file))
    } catch (readError: unknown) {
      setRestoredPackage(undefined)
      setError(
        readError instanceof Error
          ? readError.message
          : 'The media backup could not be read.',
      )
    } finally {
      setIsWorking(false)
      event.target.value = ''
    }
  }

  async function importZip() {
    if (!restoredPackage || safetyStatus === 'pending' || !confirmed) return
    if (
      !window.confirm(
        'Import Media Backup will permanently replace all current local data and media. Continue?',
      )
    ) {
      return
    }

    setIsWorking(true)
    setError('')
    try {
      setSummary(await replaceDatabaseWithMedia(restoredPackage))
      setRestoredPackage(undefined)
      setSafetyStatus('pending')
      setConfirmed(false)
    } catch (importError: unknown) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'The media backup could not be imported.',
      )
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section className={`${styles.panel} ${styles.dangerPanel}`}>
      <div className={styles.heading}>
        <span>5</span>
        <div>
          <h2>Media Backup</h2>
          <p>
            Export or restore a ZIP backup containing structured data and
            optimized source images.
          </p>
        </div>
      </div>
      <p className={styles.note}>
        Browser speech is generated on demand, so no audio files are stored or
        included.
      </p>
      <div className={styles.buttonRow}>
        <button
          type="button"
          disabled={isWorking}
          onClick={() => void exportZip()}
        >
          {isWorking ? 'Working…' : 'Export Media Backup'}
        </button>
        <label className={styles.fileButton}>
          Choose ZIP backup
          <input
            type="file"
            accept="application/zip,.zip"
            disabled={isWorking}
            onChange={(event) => void selectZip(event)}
          />
        </label>
      </div>

      {restoredPackage ? (
        <div className={styles.flow}>
          <div className={styles.mergePlan}>
            <strong>Validated media backup</strong>
            <dl>
              <div>
                <dt>Decks</dt>
                <dd>{restoredPackage.decks.length}</dd>
              </div>
              <div>
                <dt>Cards</dt>
                <dd>{restoredPackage.cards.length}</dd>
              </div>
              <div>
                <dt>Source images</dt>
                <dd>{restoredPackage.sourceImages.length}</dd>
              </div>
            </dl>
          </div>
          <div className={styles.safetyStep}>
            <strong>Safety export required</strong>
            <p>
              Download a complete current ZIP backup, or explicitly skip this
              protection.
            </p>
            <div className={styles.buttonRow}>
              <button
                type="button"
                disabled={isWorking}
                onClick={() => void exportZip(true)}
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
                Safety step:{' '}
                {safetyStatus === 'downloaded' ? 'downloaded' : 'skipped'}.
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
              I understand that all current data and source images will be
              replaced.
            </span>
          </label>
          <button
            className={styles.dangerButton}
            type="button"
            disabled={
              isWorking || safetyStatus === 'pending' || !confirmed
            }
            onClick={() => void importZip()}
          >
            {isWorking ? 'Importing…' : 'Import Media Backup'}
          </button>
        </div>
      ) : null}

      {summary ? (
        <p className={styles.success}>
          Media import complete: {summary.decks} decks, {summary.cards} cards,
          and {summary.sourceImages} source images restored.
        </p>
      ) : null}
      {message ? (
        <p className={styles.success} role="status">
          {message}
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
