import { Link } from 'react-router-dom'
import styles from './DashboardScreen.module.css'

export function DashboardScreen() {
  return (
    <section className={styles.layout}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Your Dutch study space</p>
        <h1>Build vocabulary that stays with you.</h1>
        <p>
          LexiDeck keeps your decks, lessons, and review progress in this
          browser—ready for the manual card workflow coming next.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} to="/study">
            Study due cards
          </Link>
          <Link className={styles.secondaryAction} to="/data">
            Manage data
          </Link>
        </div>
      </div>

      <aside className={styles.foundationCard}>
        <span className={styles.cardLabel}>Foundation ready</span>
        <strong>Local-first from day one</strong>
        <p>
          Routes, typed data models, and the IndexedDB foundation are in place.
        </p>
        <dl>
          <div>
            <dt>My Language</dt>
            <dd>English or Simplified Chinese</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>Dutch</dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>This browser</dd>
          </div>
        </dl>
      </aside>
    </section>
  )
}
