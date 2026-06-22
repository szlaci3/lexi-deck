import { describe, expect, it } from 'vitest'
import {
  calculateOptimizedDimensions,
  SOURCE_IMAGE_MAX_DIMENSION,
} from './imageProcessing'

describe('calculateOptimizedDimensions', () => {
  it('keeps images already within the limit', () => {
    expect(calculateOptimizedDimensions(1200, 1600)).toEqual({
      width: 1200,
      height: 1600,
    })
  })

  it('resizes portrait images while preserving aspect ratio', () => {
    expect(calculateOptimizedDimensions(3024, 4032)).toEqual({
      width: 1650,
      height: SOURCE_IMAGE_MAX_DIMENSION,
    })
  })

  it('resizes landscape images while preserving aspect ratio', () => {
    expect(calculateOptimizedDimensions(4000, 2000)).toEqual({
      width: SOURCE_IMAGE_MAX_DIMENSION,
      height: 1100,
    })
  })

  it('rejects invalid dimensions', () => {
    expect(() => calculateOptimizedDimensions(0, 100)).toThrow(
      'Image dimensions must be positive.',
    )
  })
})
