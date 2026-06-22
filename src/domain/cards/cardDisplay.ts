import type { Card, DutchArticle } from './cardTypes'

export function getDutchDisplayText(
  card: Pick<Card, 'article' | 'backDutch'>,
): string {
  return formatDutchText(card.article, card.backDutch)
}

export function formatDutchText(
  article: DutchArticle,
  backDutch: string,
): string {
  const dutch = stripSelectedArticle(article, backDutch)

  if (article === 'de' || article === 'het') {
    return `${article} ${dutch}`
  }

  return dutch
}

export function stripSelectedArticle(
  article: DutchArticle,
  backDutch: string,
): string {
  const dutch = backDutch.trim()

  if (article === 'de' || article === 'het') {
    return dutch.replace(new RegExp(`^${article}\\s+`, 'iu'), '')
  }

  return dutch
}
