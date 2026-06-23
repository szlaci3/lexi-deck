import { AdditiveImportPanel } from './AdditiveImportPanel'
import styles from './DataManagementScreen.module.css'
import { ExportDatabasePanel } from './ExportDatabasePanel'
import { ImportDatabasePanel } from './ImportDatabasePanel'
import { CardTextExportPanel } from './CardTextExportPanel'
import { MediaBackupPanel } from './MediaBackupPanel'
import { DataSafetyPanel } from './DataSafetyPanel'

export function DataManagementScreen() {
  return (
    <div className={styles.page}>
      <header>
        <p>Data management</p>
        <h1>Your data stays yours.</h1>
        <span>
          Back up, restore, or safely combine local LexiDeck databases.
          Export selected cards for spreadsheets or Anki when needed.
        </span>
      </header>

      <div className={styles.panels}>
        <ExportDatabasePanel />
        <ImportDatabasePanel />
        <AdditiveImportPanel />
        <CardTextExportPanel />
        <MediaBackupPanel />
        <DataSafetyPanel />
      </div>
    </div>
  )
}
