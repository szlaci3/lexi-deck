import type { ExportBundleV1, ImportSummary } from './exportTypes'

export function summarizeBundle(bundle: ExportBundleV1): ImportSummary {
  return {
    decks: bundle.decks.length,
    lessons: bundle.lessons.length,
    cards: bundle.cards.length,
    reviewStates: bundle.reviewStates.length,
    reviewLogs: bundle.reviewLogs.length,
    settings: bundle.settings.length,
    knownWords: bundle.knownWords.length,
  }
}

export function verifyImportedCounts(
  expected: ImportSummary,
  actual: ImportSummary,
): void {
  for (const key of Object.keys(expected) as Array<keyof ImportSummary>) {
    if (expected[key] !== actual[key]) {
      throw new Error(
        `Import verification failed for ${key}: expected ${expected[key]}, found ${actual[key]}.`,
      )
    }
  }
}
