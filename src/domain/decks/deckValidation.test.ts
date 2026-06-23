import { describe, expect, it } from 'vitest'
import { validateDeckInput } from './deckValidation'

describe('validateDeckInput', () => {
  it('trims valid deck values and preserves Chinese', () => {
    expect(
      validateDeckInput({
        name: '  Nederlands A1  ',
        description: '  我的荷兰语课程  ',
        myLanguage: 'zh-Hans',
      }),
    ).toEqual({
      valid: true,
      value: {
        name: 'Nederlands A1',
        description: '我的荷兰语课程',
        myLanguage: 'zh-Hans',
      },
    })
  })

  it('requires a name', () => {
    const result = validateDeckInput({
      name: ' ',
      description: '',
      myLanguage: 'en',
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.name).toBeDefined()
    }
  })
})
