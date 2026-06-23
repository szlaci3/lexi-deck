import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { StudyRating } from '../../domain/srs/srsTypes'
import { RatingButtons } from './RatingButtons'

describe('RatingButtons', () => {
  it('renders exactly Hard and Easy with their fixed intervals', () => {
    const previews = {
      hard: {
        reviewState: {} as never,
        intervalLabel: '10 min',
      },
      easy: {
        reviewState: {} as never,
        intervalLabel: '1 day',
      },
    } satisfies Record<
      StudyRating,
      {
        reviewState: never
        intervalLabel: string
      }
    >

    const markup = renderToStaticMarkup(
      <RatingButtons
        previews={previews}
        disabled={false}
        onRate={vi.fn()}
      />,
    )

    expect(markup.match(/<button/g)).toHaveLength(2)
    expect(markup).toContain('Hard')
    expect(markup).toContain('10 min')
    expect(markup).toContain('Easy')
    expect(markup).toContain('1 day')
    expect(markup).not.toContain('Again')
    expect(markup).not.toContain('Good')
  })
})
