export type BackupExportKind = 'database' | 'media'

export type LastBackupExport = {
  exportedAt: string
  kind: BackupExportKind
}

export const backupExportedEvent = 'lexideck:backup-exported'
const lastBackupExportKey = 'lexideck:last-backup-export'

export function recordBackupExport(
  exportedAt: string,
  kind: BackupExportKind,
): void {
  const record: LastBackupExport = { exportedAt, kind }
  localStorage.setItem(lastBackupExportKey, JSON.stringify(record))
  window.dispatchEvent(new CustomEvent(backupExportedEvent, { detail: record }))
}

export function getLastBackupExport(): LastBackupExport | undefined {
  const stored = localStorage.getItem(lastBackupExportKey)
  if (!stored) return undefined

  try {
    const value: unknown = JSON.parse(stored)
    if (
      typeof value === 'object' &&
      value !== null &&
      'exportedAt' in value &&
      typeof value.exportedAt === 'string' &&
      'kind' in value &&
      (value.kind === 'database' || value.kind === 'media') &&
      !Number.isNaN(Date.parse(value.exportedAt))
    ) {
      return { exportedAt: value.exportedAt, kind: value.kind }
    }
  } catch {
    return undefined
  }

  return undefined
}

export function clearBackupExportHistory(): void {
  localStorage.removeItem(lastBackupExportKey)
}
