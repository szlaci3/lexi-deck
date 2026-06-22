import type { ExportBundleV1 } from '../../domain/importExport/exportTypes'
import { parseAndValidateImportJson } from '../../domain/importExport/validateImportBundle'

export async function readImportFile(file: File): Promise<ExportBundleV1> {
  const validation = parseAndValidateImportJson(await file.text())
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }

  return validation.bundle
}
