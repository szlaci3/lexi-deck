import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { StudyRating } from '../../domain/srs/srsTypes'
import { RatingButtons } from './RatingButtons'

describe('RatingButtons', () => {
  it('只显示“不会”和“会”以及固定间隔', () => {
    const previews = {
      hard: {
        reviewState: {} as never,
        intervalLabel: '10分钟',
      },
      easy: {
        reviewState: {} as never,
        intervalLabel: '1 天',
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
    expect(markup).toContain('不会')
    expect(markup).toContain('10分钟')
    expect(markup).toContain('会')
    expect(markup).toContain('1 天')
    expect(markup).not.toContain('Again')
    expect(markup).not.toContain('Good')
  })
})
