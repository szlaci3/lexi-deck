import { stripSelectedArticle } from '../cards/cardDisplay'
import type { DutchArticle } from '../cards/cardTypes'
import { normalizeDutchNoun } from '../duplicates/normalizeText'
import type { CandidateDraft, CandidateType } from './candidateTypes'

const vocabularySeparatorPattern = /\s+(?:—|–|-|=|:)\s+|\t+/u

export function extractVocabularyCandidates(text: string): CandidateDraft[] {
  const seen = new Set<string>()

  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const candidate = createCandidateDraft(line)
      if (!candidate || seen.has(candidate.normalizedText)) {
        return []
      }
      seen.add(candidate.normalizedText)
      return [candidate]
    })
}

export function createCandidateDraft(text: string): CandidateDraft | undefined {
  const trimmed = text.trim()
  if (!trimmed) {
    return undefined
  }

  const [dutchPart = '', ...meaningParts] = trimmed.split(
    vocabularySeparatorPattern,
  )
  const article = detectArticle(dutchPart)
  const rawText = stripSelectedArticle(article, dutchPart).trim()

  if (!rawText) {
    return undefined
  }

  return {
    rawText,
    normalizedText: normalizeDutchNoun(rawText),
    candidateType: detectCandidateType(rawText),
    article,
    myLanguageMeaning: meaningParts.join(' — ').trim(),
  }
}

export function detectCandidateType(text: string): CandidateType {
  return text.trim().split(/\s+/u).length > 1 ? 'expression' : 'word'
}

function detectArticle(text: string): DutchArticle {
  if (/^de\s+/iu.test(text)) {
    return 'de'
  }
  if (/^het\s+/iu.test(text)) {
    return 'het'
  }
  return detectCandidateType(text) === 'expression' ? 'none' : 'unknown'
}
