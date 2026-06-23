import type { KnownWord } from '../../domain/vocabulary/knownWords'
import { db } from '../dexie'

export async function listKnownWords(): Promise<KnownWord[]> {
  const knownWords = await db.knownWords.toArray()
  return knownWords.sort((left, right) =>
    left.displayText.localeCompare(right.displayText, 'nl'),
  )
}

export async function removeKnownWord(id: string): Promise<void> {
  const knownWord = await db.knownWords.get(id)
  if (!knownWord) {
    throw new Error('This known word could not be found.')
  }
  await db.knownWords.delete(id)
}
