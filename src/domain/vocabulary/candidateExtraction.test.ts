import { describe, expect, it } from 'vitest'
import {
  createCandidateDraft,
  extractVocabularyCandidates,
} from './candidateExtraction'

describe('candidate extraction', () => {
  it('extracts vocabulary-list lines with structured articles', () => {
    expect(
      extractVocabularyCandidates(
        'de komkommer — cucumber\nhet huis - house\nik heb dorst\tI am thirsty',
      ),
    ).toEqual([
      {
        rawText: 'komkommer',
        normalizedText: 'komkommer',
        candidateType: 'word',
        article: 'de',
        myLanguageMeaning: 'cucumber',
      },
      {
        rawText: 'huis',
        normalizedText: 'huis',
        candidateType: 'word',
        article: 'het',
        myLanguageMeaning: 'house',
      },
      {
        rawText: 'ik heb dorst',
        normalizedText: 'ik heb dorst',
        candidateType: 'expression',
        article: 'none',
        myLanguageMeaning: 'I am thirsty',
      },
    ])
  })

  it('creates editable candidates when no meaning is present', () => {
    expect(createCandidateDraft('fiets')).toMatchObject({
      rawText: 'fiets',
      article: 'unknown',
      myLanguageMeaning: '',
    })
  })

  it('removes duplicate Dutch proposals from one extraction', () => {
    expect(extractVocabularyCandidates('de fiets — bike\nfiets — bicycle')).toHaveLength(1)
  })
})
