import type { Card } from '../cards/cardTypes'
import { getDutchDisplayText } from '../cards/cardDisplay'

export function getDutchAudioText(
  card: Pick<Card, 'article' | 'backDutch'>,
): string {
  return getDutchDisplayText(card)
}
