const punctuationPattern = /[“”„"'‘’.,!?;:()[\]{}]/gu

export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('nl')
    .replace(punctuationPattern, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

export function normalizeDutchNoun(value: string): string {
  return normalizeText(value).replace(/^(de|het)\s+/u, '')
}
