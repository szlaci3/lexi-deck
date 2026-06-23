import { describe, expect, it } from 'vitest'
import { validateCardInput } from './cardValidation'

describe('validateCardInput', () => {
  it('trims values and preserves Chinese prompts', () => {
    expect(
      validateCardInput({
        lessonId: ' lesson-1 ',
        frontText: '  黄瓜  ',
        backDutch: ' komkommer ',
        article: 'de',
        notes: '  groente  ',
      }),
    ).toEqual({
      valid: true,
      value: {
        lessonId: 'lesson-1',
        frontText: '黄瓜',
        backDutch: 'komkommer',
        article: 'de',
        notes: 'groente',
      },
    })
  })

  it('requires lesson, prompt, and Dutch answer', () => {
    const result = validateCardInput({
      lessonId: '',
      frontText: '',
      backDutch: '',
      article: 'unknown',
      notes: '',
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.lessonId).toBeDefined()
      expect(result.errors.frontText).toBeDefined()
      expect(result.errors.backDutch).toBeDefined()
    }
  })

  it('stores Dutch text without a matching selected article prefix', () => {
    expect(
      validateCardInput({
        lessonId: 'lesson-1',
        frontText: 'house',
        backDutch: 'het huis',
        article: 'het',
        notes: '',
      }),
    ).toMatchObject({
      valid: true,
      value: { backDutch: 'huis', article: 'het' },
    })
  })
})
