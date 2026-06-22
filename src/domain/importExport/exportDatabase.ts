import type {
  ExportBundleV1,
  ExportTables,
  ImportPreview,
} from './exportTypes'

export function buildExportBundle(
  tables: ExportTables,
  appVersion: string,
  exportedAt: string,
): ExportBundleV1 {
  return {
    manifest: {
      appName: 'LexiDeck',
      appVersion,
      exportVersion: 1,
      exportedAt,
      dataVersion: 1,
      mediaIncluded: false,
    },
    ...tables,
  }
}

export function serializeExportBundle(bundle: ExportBundleV1): string {
  return JSON.stringify(bundle, null, 2)
}

export function createExportFilename(exportedAt: string): string {
  const date = new Date(exportedAt)
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    'lexideck-backup',
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `-${pad(date.getHours())}-${pad(date.getMinutes())}.json`
}

export function createImportPreview(bundle: ExportBundleV1): ImportPreview {
  return {
    exportedAt: bundle.manifest.exportedAt,
    exportVersion: bundle.manifest.exportVersion,
    mediaIncluded: bundle.manifest.mediaIncluded,
    deckCount: bundle.decks.length,
    lessonCount: bundle.lessons.length,
    cardCount: bundle.cards.length,
    reviewStateCount: bundle.reviewStates.length,
    reviewLogCount: bundle.reviewLogs.length,
    settingsCount: bundle.settings.length,
    knownWordCount: bundle.knownWords.length,
  }
}
