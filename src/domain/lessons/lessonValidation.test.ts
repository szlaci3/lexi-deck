import { describe, expect, it } from 'vitest'
import { validateLessonInput } from './lessonValidation'

describe('validateLessonInput', () => {
  it('trims valid lesson values', () => {
    expect(
      validateLessonInput({
        title: '  Les 1  ',
        description: '  Kennismaken  ',
      }),
    ).toEqual({
      valid: true,
      value: {
        title: 'Les 1',
        description: 'Kennismaken',
      },
    })
  })

  it('requires a title and description', () => {
    const result = validateLessonInput({
      title: '',
      description: ' ',
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.title).toBeDefined()
      expect(result.errors.description).toBeDefined()
    }
  })
})
