import { formatDutchText } from './cardDisplay'
import type { Card } from './cardTypes'

export type CardPresentation = {
  promptKind: 'text' | 'image'
  promptText: string
  promptImageId?: string
  promptLanguage: 'myLanguage' | 'dutch' | 'image'
  answerKind: 'text' | 'image'
  answerText: string
  answerImageId?: string
  answerLanguage: 'myLanguage' | 'dutch' | 'image'
  secondaryAnswerText?: string
  dutchOnPrompt: boolean
  dutchOnAnswer: boolean
}

export function getCardPresentation(card: Card): CardPresentation {
  const dutch = formatDutchText(card.article, card.backDutch)

  switch (card.cardType) {
    case 'myLanguageToDutch':
      return {
        promptKind: 'text',
        promptText: card.frontText,
        promptLanguage: 'myLanguage',
        answerKind: 'text',
        answerText: dutch,
        answerLanguage: 'dutch',
        dutchOnPrompt: false,
        dutchOnAnswer: true,
      }
    case 'imageToDutch':
      return {
        promptKind: 'image',
        promptText: '',
        promptImageId: card.frontImageId,
        promptLanguage: 'image',
        answerKind: 'text',
        answerText: dutch,
        answerLanguage: 'dutch',
        secondaryAnswerText: card.backMyLanguage || undefined,
        dutchOnPrompt: false,
        dutchOnAnswer: true,
      }
    case 'dutchToMyLanguage':
      return {
        promptKind: 'text',
        promptText: dutch,
        promptLanguage: 'dutch',
        answerKind: 'text',
        answerText: card.backMyLanguage,
        answerLanguage: 'myLanguage',
        dutchOnPrompt: true,
        dutchOnAnswer: false,
      }
    case 'dutchToImage':
      return {
        promptKind: 'text',
        promptText: dutch,
        promptLanguage: 'dutch',
        answerKind: 'image',
        answerText: '',
        answerImageId: card.frontImageId,
        answerLanguage: 'image',
        secondaryAnswerText: card.backMyLanguage || undefined,
        dutchOnPrompt: true,
        dutchOnAnswer: false,
      }
  }
}
