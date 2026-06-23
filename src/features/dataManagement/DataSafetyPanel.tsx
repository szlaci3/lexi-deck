import { useCallback, useEffect, useState } from 'react'
import { clearLocalData } from '../../db/repositories/importExportRepository'
import panelStyles from './DataPanel.module.css'
import styles from './DataSafetyPanel.module.css'
import {
  backupExportedEvent,
  clearBackupExportHistory,
  getLastBackupExport,
  type LastBackupExport,
} from './exportHistory'

type StorageEstimate = {
  usage?: number
  quota?: number
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return 'Unavailable'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = units[0]
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024
    unit = units[index]
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`
}

function formatExportDate(exportedAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(exportedAt))
}

export function DataSafetyPanel() {
  const [storage, setStorage] = useState<StorageEstimate>()
  const [lastExport, setLastExport] = useState<LastBackupExport | undefined>(
    getLastBackupExport,
  )
  const [confirmation, setConfirmation] = useState('')
  const [isClearing, setIsClearing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refreshStorage = useCallback(async () => {
    if (!navigator.storage?.estimate) {
      setStorage({})
      return
    }
    const estimate = await navigator.storage.estimate()
    setStorage({ usage: estimate.usage, quota: estimate.quota })
  }, [])

  useEffect(() => {
    let active = true
    const estimate = navigator.storage?.estimate
      ? navigator.storage.estimate()
      : Promise.resolve<StorageEstimate>({})
    void estimate
      .then((result) => {
        if (active) {
          setStorage({ usage: result.usage, quota: result.quota })
        }
      })
      .catch(() => {
        if (active) {
          setStorage({})
        }
      })

    function handleBackupExported(event: Event) {
      const customEvent = event as CustomEvent<LastBackupExport>
      setLastExport(customEvent.detail)
      void refreshStorage()
    }

    window.addEventListener(backupExportedEvent, handleBackupExported)
    return () => {
      active = false
      window.removeEventListener(backupExportedEvent, handleBackupExported)
    }
  }, [refreshStorage])

  async function handleClear() {
    if (confirmation !== 'CLEAR') return
    if (
      !window.confirm(
        'Clear all local LexiDeck data? This cannot be undone without a backup.',
      )
    ) {
      return
    }

    setIsClearing(true)
    setMessage('')
    setError('')
    try {
      await clearLocalData()
      clearBackupExportHistory()
      setLastExport(undefined)
      setConfirmation('')
      setMessage('All local LexiDeck data was cleared.')
      await refreshStorage()
    } catch (clearError: unknown) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : 'Local data could not be cleared.',
      )
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <section className={panelStyles.panel}>
      <div className={panelStyles.heading}>
        <span>6</span>
        <div>
          <h2>Data Safety</h2>
          <p>Review local storage and backup status before advanced actions.</p>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span>Storage usage</span>
          <strong>
            {storage
              ? `${formatBytes(storage.usage)} of ${formatBytes(storage.quota)}`
              : 'Checking…'}
          </strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Last backup export</span>
          <strong>
            {lastExport
              ? `${formatExportDate(lastExport.exportedAt)} (${lastExport.kind})`
              : 'No export recorded on this device'}
          </strong>
        </div>
      </div>

      {!lastExport ? (
        <p className={panelStyles.note}>
          Export a database or media backup regularly so local browser data is
          recoverable.
        </p>
      ) : null}

      <details className={styles.dangerZone}>
        <summary>Advanced danger zone</summary>
        <div className={styles.dangerContent}>
          <p>
            Clear Local Data permanently removes decks, cards, review history,
            settings, source images, OCR text, and vocabulary candidates from
            this browser.
          </p>
          <label>
            Type CLEAR to enable this action
            <input
              value={confirmation}
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <button
            className={panelStyles.dangerButton}
            type="button"
            disabled={isClearing || confirmation !== 'CLEAR'}
            onClick={() => void handleClear()}
          >
            {isClearing ? 'Clearing…' : 'Clear Local Data'}
          </button>
        </div>
      </details>

      {message ? (
        <p className={panelStyles.success} role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className={panelStyles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
