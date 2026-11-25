import { describe, expect, it } from 'vitest'
import { bucketIndexFor, buildShareText, percentileLine } from './resultsFormat'
import type { HistogramBucket, ResultsResponse } from '../../lib/types'

const histogram: HistogramBucket[] = Array.from({ length: 20 }, (_, b) => ({ from: b * 25, to: b * 25 + 24, count: b % 3 }))

describe('bucketIndexFor', () => {
  it('finds the bucket holding a score, with the max in the last bucket', () => {
    expect(bucketIndexFor(histogram, 0)).toBe(0)
    expect(bucketIndexFor(histogram, 235)).toBe(9)
    expect(bucketIndexFor(histogram, 499)).toBe(19)
    expect(bucketIndexFor(histogram, 500)).toBe(19)
    expect(bucketIndexFor([], 10)).toBe(-1)
  })
})

describe('percentileLine', () => {
  it('handles the first finisher', () => {
    expect(percentileLine(0, 1)).toMatch(/First diver/)
    expect(percentileLine(82, 37)).toBe('Deeper than 82% of divers')
  })
})

describe('buildShareText', () => {
  it('summarises score, depth, bearing and the per-prompt log without answer text', () => {
    const results: ResultsResponse = {
      player: { display_name: 'Ada', figpal_slug: 'figgy', score: 235, depth_m: 2350, finished: true, rounds_resolved: 5 },
      rank: 4,
      finished_count: 37,
      better_than_pct: 82,
      max_score: 500,
      histogram,
      rounds: [
        { round: 1, theme: 't', prompt: 'p', accepted: true, tier: 'figlion', points: 100, answer: 'SECRET_A' },
        { round: 2, theme: 't', prompt: 'p', accepted: false, tier: null, points: 0, answer: null },
      ],
    }
    const text = buildShareText(results)
    expect(text).toContain('235/500 · -2,350 m')
    expect(text).toContain('Rare. Below the thermocline.')
    expect(text).toContain('1. Figlion +100')
    expect(text).toContain('2. Nothing landed +0')
    expect(text).not.toContain('SECRET_A')
  })
})
