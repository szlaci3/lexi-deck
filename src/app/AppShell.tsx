import { NavLink, Outlet } from 'react-router-dom'
import { useUiStore } from './uiStore'
import styles from './AppShell.module.css'

const navigation = [
  { to: '/', label: 'Decks', end: true },
  { to: '/study', label: 'Study' },
  { to: '/data', label: 'Data' },
  { to: '/settings', label: 'Settings' },
] as const

export function AppShell() {
  const isNavigationOpen = useUiStore((state) => state.isNavigationOpen)
  const closeNavigation = useUiStore((state) => state.closeNavigation)
  const toggleNavigation = useUiStore((state) => state.toggleNavigation)

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <NavLink className={styles.brand} to="/" onClick={closeNavigation}>
          <span className={styles.brandMark} aria-hidden="true">
            L
          </span>
          <span>
            <strong>LexiDeck</strong>
            <small>Dutch, one card at a time</small>
          </span>
        </NavLink>

        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={isNavigationOpen}
          aria-controls="primary-navigation"
          onClick={toggleNavigation}
        >
          Menu
        </button>

        <nav
          id="primary-navigation"
          className={isNavigationOpen ? styles.navigationOpen : styles.navigation}
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              onClick={closeNavigation}
              className={({ isActive }) =>
                isActive ? styles.activeLink : styles.navigationLink
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
