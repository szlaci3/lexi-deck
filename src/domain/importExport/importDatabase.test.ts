import { describe, expect, it } from 'vitest'
import { verifyImportedCounts } from './importDatabase'

const summary = {
  decks: 1,
  lessons: 2,
  cards: 3,
  reviewStates: 3,
  reviewLogs: 4,
  settings: 1,
  knownWords: 0,
}

describe('verifyImportedCounts', () => {
  it('accepts matching imported table counts', () => {
    expect(() => verifyImportedCounts(summary, summary)).not.toThrow()
  })

  it('rejects a partial replacement result', () => {
    expect(() =>
      verifyImportedCounts(summary, { ...summary, cards: 2 }),
    ).toThrow('Import verification failed for cards')
  })
})
