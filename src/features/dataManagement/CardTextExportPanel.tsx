import { useEffect, useMemo, useState } from 'react'
import { listExportableCards } from '../../db/repositories/importExportRepository'
import {
  createCardExportFilename,
  createCardExportRows,
  serializeAnkiText,
  serializeCardCsv,
  serializeCardTsv,
  type ExportableCard,
} from '../../domain/importExport/cardTextExport'
import { getCardPresentation } from '../../domain/cards/cardPresentation'
import { downloadTextFile } from '../../utils/download'
import panelStyles from './DataPanel.module.css'
import styles from './CardTextExportPanel.module.css'

type ExportFormat = 'csv' | 'tsv' | 'anki'

export function CardTextExportPanel() {
  const [records, setRecords] = useState<ExportableCard[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deckFilter, setDeckFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true
    listExportableCards()
      .then((nextRecords) => {
        if (!isActive) return
        setRecords(nextRecords)
        setSelectedIds(new Set(nextRecords.map((record) => record.card.id)))
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Cards could not be prepared for export.',
          )
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const decks = useMemo(
    () =>
      [...new Map(records.map((record) => [record.deck.id, record.deck])).values()]
        .sort((left, right) => left.name.localeCompare(right.name)),
    [records],
  )
  const visibleRecords = useMemo(
    () =>
      deckFilter
        ? records.filter((record) => record.deck.id === deckFilter)
        : records,
    [deckFilter, records],
  )
  const selectedRecords = useMemo(
    () => records.filter((record) => selectedIds.has(record.card.id)),
    [records, selectedIds],
  )

  function toggleCard(cardId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  function selectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      visibleRecords.forEach((record) => next.add(record.card.id))
      return next
    })
  }

  function clearVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      visibleRecords.forEach((record) => next.delete(record.card.id))
      return next
    })
  }

  function exportCards(format: ExportFormat) {
    if (selectedRecords.length === 0) {
      setError('Select at least one card.')
      return
    }

    setError('')
    const exportedAt = new Date()
    if (format === 'csv') {
      downloadTextFile(
        serializeCardCsv(createCardExportRows(selectedRecords)),
        createCardExportFilename('csv', exportedAt),
        'text/csv;charset=utf-8',
      )
    } else if (format === 'tsv') {
      downloadTextFile(
        serializeCardTsv(createCardExportRows(selectedRecords)),
        createCardExportFilename('tsv', exportedAt),
        'text/tab-separated-values;charset=utf-8',
      )
    } else {
      downloadTextFile(
        serializeAnkiText(selectedRecords),
        createCardExportFilename('txt', exportedAt),
        'text/plain;charset=utf-8',
      )
    }
    setMessage(
      `${selectedRecords.length} ${
        selectedRecords.length === 1 ? 'card' : 'cards'
      } exported.`,
    )
  }

  return (
    <section className={panelStyles.panel}>
      <div className={panelStyles.heading}>
        <span>4</span>
        <div>
          <h2>Export Cards</h2>
          <p>
            Download selected cards as CSV, TSV, or Anki-compatible text.
          </p>
        </div>
      </div>

      <p className={panelStyles.note}>
        Text exports do not include image or audio files. Image cards include a
        readable filename placeholder.
      </p>

      {isLoading ? (
        <p className={styles.status}>Loading cards…</p>
      ) : records.length === 0 ? (
        <p className={styles.status}>No active cards are available to export.</p>
      ) : (
        <>
          <div className={styles.controls}>
            <label>
              Deck
              <select
                value={deckFilter}
                onChange={(event) => setDeckFilter(event.target.value)}
              >
                <option value="">All decks</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.selectionButtons}>
              <button type="button" onClick={selectVisible}>
                Select visible
              </button>
              <button type="button" onClick={clearVisible}>
                Clear visible
              </button>
            </div>
          </div>

          <div className={styles.selectionSummary}>
            <strong>{selectedRecords.length} selected</strong>
            <span>{visibleRecords.length} visible</span>
          </div>

          <div className={styles.cardList}>
            {visibleRecords.map((record) => {
              const presentation = getCardPresentation(record.card)
              return (
                <label key={record.card.id} className={styles.cardOption}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(record.card.id)}
                    onChange={() => toggleCard(record.card.id)}
                  />
                  <span>
                    <strong>
                      {presentation.promptKind === 'image'
                        ? `Image: ${record.imageFileName ?? 'unavailable'}`
                        : presentation.promptText}
                    </strong>
                    <small>
                      {record.deck.name} · {record.lesson.title} ·{' '}
                      {formatCardType(record.card.cardType)}
                    </small>
                  </span>
                </label>
              )
            })}
          </div>

          <div className={styles.exportButtons}>
            <button type="button" onClick={() => exportCards('csv')}>
              Export CSV
            </button>
            <button type="button" onClick={() => exportCards('tsv')}>
              Export TSV
            </button>
            <button
              className={styles.primaryExport}
              type="button"
              onClick={() => exportCards('anki')}
            >
              Export Anki-compatible text
            </button>
          </div>
        </>
      )}

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

function formatCardType(cardType: ExportableCard['card']['cardType']): string {
  const labels: Record<ExportableCard['card']['cardType'], string> = {
    myLanguageToDutch: 'My Language → Dutch',
    imageToDutch: 'Image → Dutch',
    dutchToMyLanguage: 'Dutch → My Language',
    dutchToImage: 'Dutch → Image',
  }
  return labels[cardType]
}
