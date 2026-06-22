import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { openLexiDeckDatabase } from '../db/dexie'
import { router } from './routes'
import styles from './App.module.css'

type DatabaseStatus =
  | { state: 'opening' }
  | { state: 'ready' }
  | { state: 'error'; message: string }

export function App() {
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({
    state: 'opening',
  })

  useEffect(() => {
    let isActive = true

    openLexiDeckDatabase()
      .then(() => {
        if (isActive) {
          setDatabaseStatus({ state: 'ready' })
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setDatabaseStatus({
            state: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'The local database could not be opened.',
          })
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  if (databaseStatus.state === 'opening') {
    return (
      <main className={styles.statusPage}>
        <p className={styles.eyebrow}>LexiDeck</p>
        <h1>Preparing your local study space…</h1>
      </main>
    )
  }

  if (databaseStatus.state === 'error') {
    return (
      <main className={styles.statusPage} role="alert">
        <p className={styles.eyebrow}>Local database unavailable</p>
        <h1>LexiDeck could not start</h1>
        <p>{databaseStatus.message}</p>
        <p>Your browser may have blocked IndexedDB or private storage.</p>
      </main>
    )
  }

  return <RouterProvider router={router} />
}
