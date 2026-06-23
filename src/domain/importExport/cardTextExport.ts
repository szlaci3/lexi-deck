import { getDutchDisplayText } from '../cards/cardDisplay'
import { getCardPresentation } from '../cards/cardPresentation'
import type { Card } from '../cards/cardTypes'
import type { Deck } from '../decks/deckTypes'
import type { Lesson } from '../lessons/lessonTypes'

export type ExportableCard = {
  card: Card
  deck: Deck
  lesson: Lesson
  imageFileName?: string
}

export type CardExportRow = {
  myLanguageText: string
  dutchDisplayText: string
  rawDutchText: string
  article: Card['article']
  deck: string
  lesson: string
  notes: string
  cardType: Card['cardType']
  imageFileName: string
}

const spreadsheetHeaders = [
  'My Language',
  'Dutch Display',
  'Dutch Raw',
  'Article',
  'Deck',
  'Lesson',
  'Notes',
  'Card Type',
  'Image File',
] as const

export function createCardExportRows(
  records: ExportableCard[],
): CardExportRow[] {
  return records.map(({ card, deck, lesson, imageFileName }) => ({
    myLanguageText: card.backMyLanguage || card.frontText,
    dutchDisplayText: getDutchDisplayText(card),
    rawDutchText: card.backDutch,
    article: card.article,
    deck: deck.name,
    lesson: lesson.title,
    notes: card.notes,
    cardType: card.cardType,
    imageFileName: imageFileName ?? '',
  }))
}

export function serializeCardCsv(rows: CardExportRow[]): string {
  return `\uFEFF${serializeDelimitedRows(rows, ',')}`
}

export function serializeCardTsv(rows: CardExportRow[]): string {
  return `\uFEFF${serializeDelimitedRows(rows, '\t')}`
}

export function serializeAnkiText(records: ExportableCard[]): string {
  const headers = [
    '#separator:Tab',
    '#html:false',
    '#columns:Front\tBack\tNotes\tDeck\tTags',
    '#deck column:4',
    '#tags column:5',
  ]
  const rows = records.map((record) => {
    const presentation = getCardPresentation(record.card)
    const front = presentationValue(
      presentation.promptKind,
      presentation.promptText,
      record.imageFileName,
    )
    const back = presentationValue(
      presentation.answerKind,
      presentation.answerText,
      record.imageFileName,
    )
    const tags = [
      'LexiDeck',
      tagValue(record.card.cardType),
      tagValue(record.deck.name),
      tagValue(record.lesson.title),
    ].join(' ')

    return [front, back, record.card.notes, record.deck.name, tags]
      .map((value) => escapeDelimitedField(value, '\t'))
      .join('\t')
  })

  return [...headers, ...rows].join('\n')
}

export function createCardExportFilename(
  extension: 'csv' | 'tsv' | 'txt',
  exportedAt: Date,
): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    'lexideck-cards',
    exportedAt.getFullYear(),
    pad(exportedAt.getMonth() + 1),
    pad(exportedAt.getDate()),
  ].join('-') + `-${pad(exportedAt.getHours())}-${pad(exportedAt.getMinutes())}.${extension}`
}

function serializeDelimitedRows(
  rows: CardExportRow[],
  delimiter: ',' | '\t',
): string {
  const values = rows.map((row) => [
    row.myLanguageText,
    row.dutchDisplayText,
    row.rawDutchText,
    row.article,
    row.deck,
    row.lesson,
    row.notes,
    row.cardType,
    row.imageFileName,
  ])

  return [spreadsheetHeaders, ...values]
    .map((row) =>
      row.map((value) => escapeDelimitedField(value, delimiter)).join(delimiter),
    )
    .join('\r\n')
}

function escapeDelimitedField(value: string, delimiter: string): string {
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function presentationValue(
  kind: 'text' | 'image',
  text: string,
  imageFileName?: string,
): string {
  return kind === 'image'
    ? `[Image not included: ${imageFileName || 'source image'}]`
    : text
}

function tagValue(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
}
