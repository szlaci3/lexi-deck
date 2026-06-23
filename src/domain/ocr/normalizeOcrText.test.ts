import { describe, expect, it } from 'vitest'
import { normalizeOcrText } from './normalizeOcrText'

describe('normalizeOcrText', () => {
  it('normalizes line endings and repeated whitespace', () => {
    expect(
      normalizeOcrText('  de   komkommer\r\n\r\n\r\n het\thuis  '),
    ).toBe('de komkommer\n\nhet huis')
  })

  it('normalizes compatible Unicode text to NFC', () => {
    expect(normalizeOcrText('cafe\u0301')).toBe('café')
  })
})
