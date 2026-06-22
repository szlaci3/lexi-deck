import { useState, type ChangeEvent } from 'react'
import {
  analyzeDatabaseMerge,
  mergeDatabase,
} from '../../db/repositories/importExportRepository'
import type {
  ExportBundleV1,
  MergePlan,
} from '../../domain/importExport/exportTypes'
import { ImportPreview } from './ImportPreview'
import { readImportFile } from './dataFile'
import styles from './DataPanel.module.css'

export function AdditiveImportPanel() {
  const [bundle, setBundle] = useState<ExportBundleV1>()
  const [plan, setPlan] = useState<MergePlan>()
  const [completedPlan, setCompletedPlan] = useState<MergePlan>()
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setError('')
    setPlan(undefined)
    setCompletedPlan(undefined)
    setIsWorking(true)

    try {
      const nextBundle = await readImportFile(file)
      setBundle(nextBundle)
      setPlan(await analyzeDatabaseMerge(nextBundle))
    } catch (fileError: unknown) {
      setBundle(undefined)
      setError(
        fileError instanceof Error
          ? fileError.message
          : 'The import file could not be analyzed.',
      )
    } finally {
      setIsWorking(false)
      event.target.value = ''
    }
  }

  async function confirmMerge() {
    if (!plan) {
      return
    }
    if (!window.confirm('Add this validated data to the current database?')) {
      return
    }

    setIsWorking(true)
    setError('')
    try {
      const result = await mergeDatabase(plan)
      setCompletedPlan(result)
      setBundle(undefined)
      setPlan(undefined)
    } catch (mergeError: unknown) {
      setError(
        mergeError instanceof Error
          ? mergeError.message
          : 'The databases could not be merged.',
      )
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <span>3</span>
        <div>
          <h2>Add to Existing Database</h2>
          <p>Merge another backup while preserving all current local data.</p>
        </div>
      </div>
      <label className={styles.fileButton}>
        Choose backup file
        <input type="file" accept="application/json,.json" onChange={selectFile} />
      </label>

      {isWorking && !plan ? <p className={styles.note}>Analyzing merge…</p> : null}

      {bundle && plan ? (
        <div className={styles.flow}>
          <ImportPreview bundle={bundle} />
          <div className={styles.mergePlan}>
            <strong>Merge plan</strong>
            <dl>
              <div>
                <dt>Decks to add</dt>
                <dd>{plan.summary.decks}</dd>
              </div>
              <div>
                <dt>Cards to add</dt>
                <dd>{plan.summary.cards}</dd>
              </div>
              <div>
                <dt>Decks renamed</dt>
                <dd>{plan.summary.renamedDecks}</dd>
              </div>
              <div>
                <dt>IDs remapped</dt>
                <dd>{plan.summary.remappedIds}</dd>
              </div>
              <div>
                <dt>Exact cards skipped</dt>
                <dd>{plan.summary.skippedExactCards}</dd>
              </div>
              <div>
                <dt>Possible duplicates</dt>
                <dd>{plan.summary.possibleDuplicateCards}</dd>
              </div>
            </dl>
            {plan.renamedDecks.length > 0 ? (
              <ul>
                {plan.renamedDecks.map((rename) => (
                  <li key={`${rename.originalName}-${rename.importedName}`}>
                    {rename.originalName} → {rename.importedName}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={isWorking}
            onClick={() => void confirmMerge()}
          >
            {isWorking ? 'Merging…' : 'Add to Existing Database'}
          </button>
        </div>
      ) : null}

      {completedPlan ? (
        <p className={styles.success}>
          Merge complete: {completedPlan.summary.cards} cards added,{' '}
          {completedPlan.summary.skippedExactCards} exact duplicates skipped.
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
