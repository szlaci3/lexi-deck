import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  archiveDeck,
  createDeck,
  listActiveDeckSummaries,
  updateDeck,
} from '../../db/repositories/deckRepository'
import {
  myLanguageLabels,
  targetLanguageLabels,
  type CreateDeckInput,
  type Deck,
  type DeckSummary,
} from '../../domain/decks/deckTypes'
import { DeckForm } from './DeckForm'
import styles from './DashboardScreen.module.css'

export function DashboardScreen() {
  const [summaries, setSummaries] = useState<DeckSummary[]>([])
  const [editingDeck, setEditingDeck] = useState<Deck>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const totalDue = summaries.reduce(
    (total, summary) => total + summary.dueCount,
    0,
  )

  const loadDecks = useCallback(async () => {
    setLoadError('')

    try {
      setSummaries(await listActiveDeckSummaries())
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error ? error.message : 'Decks could not be loaded.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    listActiveDeckSummaries()
      .then((nextSummaries) => {
        if (isActive) {
          setSummaries(nextSummaries)
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Decks could not be loaded.',
          )
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  function openCreateForm() {
    setEditingDeck(undefined)
    setIsFormOpen(true)
  }

  function openEditForm(deck: Deck) {
    setEditingDeck(deck)
    setIsFormOpen(true)
  }

  function closeForm() {
    setEditingDeck(undefined)
    setIsFormOpen(false)
  }

  async function saveDeck(input: CreateDeckInput) {
    if (editingDeck) {
      await updateDeck(editingDeck.id, input)
    } else {
      await createDeck(input)
    }

    closeForm()
    await loadDecks()
  }

  async function confirmArchive(deck: Deck) {
    const shouldArchive = window.confirm(
      `Archive “${deck.name}”? It will disappear from normal deck lists.`,
    )

    if (!shouldArchive) {
      return
    }

    try {
      await archiveDeck(deck.id)
      await loadDecks()
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error ? error.message : 'The deck could not be archived.',
      )
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Your Dutch study space</p>
          <h1>Build vocabulary that stays with you.</h1>
          <p>
            Organize each textbook or course into a local deck, with prompts in
            English or Chinese.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.studyButton} to="/study">
            Study {totalDue} due
          </Link>
          <button
            className={styles.createButton}
            type="button"
            onClick={openCreateForm}
          >
            Create deck
          </button>
        </div>
      </section>

      {isFormOpen ? (
        <DeckForm
          key={editingDeck?.id ?? 'new-deck'}
          deck={editingDeck}
          isLanguageLocked={
            editingDeck
              ? (summaries.find(({ deck }) => deck.id === editingDeck.id)
                  ?.cardCount ?? 0) > 0
              : false
          }
          onCancel={closeForm}
          onSubmit={saveDeck}
        />
      ) : null}

      <section className={styles.deckSection} aria-labelledby="deck-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Library</p>
            <h2 id="deck-heading">Active decks</h2>
          </div>
          <span className={styles.deckCount}>
            {summaries.length} {summaries.length === 1 ? 'deck' : 'decks'}
          </span>
        </div>

        {loadError ? (
          <div className={styles.errorPanel} role="alert">
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadDecks()}>
              Try again
            </button>
          </div>
        ) : null}

        {isLoading ? <p className={styles.loading}>Loading decks…</p> : null}

        {!isLoading && !loadError && summaries.length === 0 ? (
          <div className={styles.emptyState}>
            <span aria-hidden="true">Aa</span>
            <h3>Your first deck starts here.</h3>
            <p>
              Create one for a Dutch course, textbook, or vocabulary collection.
            </p>
            <button type="button" onClick={openCreateForm}>
              Create your first deck
            </button>
          </div>
        ) : null}

        <div className={styles.deckGrid}>
          {summaries.map(({ deck, cardCount, dueCount }) => (
            <article className={styles.deckCard} key={deck.id}>
              <Link className={styles.deckLink} to={`/decks/${deck.id}`}>
                <div className={styles.deckTopLine}>
                  <span>{myLanguageLabels[deck.myLanguage]} → Dutch</span>
                  <span>{dueCount} due</span>
                </div>
                <h3>{deck.name}</h3>
                <p>{deck.description}</p>
                <dl>
                  <div>
                    <dt>My Language</dt>
                    <dd>{myLanguageLabels[deck.myLanguage]}</dd>
                  </div>
                  <div>
                    <dt>Target</dt>
                    <dd>{targetLanguageLabels[deck.targetLanguage]}</dd>
                  </div>
                  <div>
                    <dt>Cards</dt>
                    <dd>{cardCount}</dd>
                  </div>
                </dl>
              </Link>
              <div className={styles.cardActions}>
                <button type="button" onClick={() => openEditForm(deck)}>
                  Edit
                </button>
                <button
                  className={styles.archiveButton}
                  type="button"
                  onClick={() => void confirmArchive(deck)}
                >
                  Archive
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
