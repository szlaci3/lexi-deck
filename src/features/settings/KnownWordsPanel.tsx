import { useEffect, useState } from 'react'
import {
  listKnownWords,
  removeKnownWord,
} from '../../db/repositories/knownWordRepository'
import type { KnownWord } from '../../domain/vocabulary/knownWords'
import styles from './KnownWordsPanel.module.css'

export function KnownWordsPanel() {
  const [knownWords, setKnownWords] = useState<KnownWord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removingId, setRemovingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true
    listKnownWords()
      .then((words) => {
        if (isActive) setKnownWords(words)
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Known words could not be loaded.',
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

  async function removeWord(word: KnownWord) {
    if (
      !window.confirm(
        `Remove “${word.displayText}” from known words? It may be proposed again.`,
      )
    ) {
      return
    }

    setRemovingId(word.id)
    setError('')
    try {
      await removeKnownWord(word.id)
      setKnownWords((current) =>
        current.filter((knownWord) => knownWord.id !== word.id),
      )
    } catch (removeError: unknown) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'The known word could not be removed.',
      )
    } finally {
      setRemovingId('')
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <p>Vocabulary filtering</p>
          <h2>Known words</h2>
        </div>
        <strong>{knownWords.length}</strong>
      </div>
      <p className={styles.intro}>
        Known Dutch words are excluded from future automatic candidate
        extraction.
      </p>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className={styles.empty}>Loading known words…</p>
      ) : knownWords.length === 0 ? (
        <p className={styles.empty}>
          No known words yet. Mark candidates as known during review.
        </p>
      ) : (
        <ul className={styles.list}>
          {knownWords.map((word) => (
            <li key={word.id}>
              <div>
                <strong>{word.displayText}</strong>
                <span>Added from {word.source}</span>
              </div>
              <button
                type="button"
                disabled={removingId === word.id}
                onClick={() => void removeWord(word)}
              >
                {removingId === word.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
