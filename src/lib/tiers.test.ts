import { describe, expect, it } from 'vitest'
import { TIERS, depthFromPoints, formatDepth, getTier, isTierKey, rankTitle } from './tiers'

describe('tiers', () => {
  it('match public.tiers points in order', () => {
    expect(TIERS.map((t) => [t.key, t.points])).toEqual([
      ['common', 10],
      ['overplayed', 15],
      ['uncommon', 30],
      ['rare', 60],
      ['deep_cut', 85],
      ['figlion', 100],
    ])
  })

  it('every tier has a text label (never color alone)', () => {
    for (const t of TIERS) expect(t.word.length).toBeGreaterThan(0)
  })

  it('narrows tier keys', () => {
    expect(isTierKey('deep_cut')).toBe(true)
    expect(isTierKey('no_echo')).toBe(false)
    expect(isTierKey(null)).toBe(false)
    expect(getTier('figlion').label).toBe('Figillion')
    expect(getTier('figlion').word).toBe('figillion')
  })
})

describe('depth', () => {
  it('pans 10 px per point; max score is 5,000 px', () => {
    expect(depthFromPoints(60)).toBe(600)
    expect(depthFromPoints(500)).toBe(5000)
    expect(depthFromPoints(-5)).toBe(0)
  })

  it('formats depth as canvas pixels with separators', () => {
    expect(formatDepth(0)).toBe('0 px')
    expect(formatDepth(850)).toBe('850 px')
    expect(formatDepth(2350)).toBe('2,350 px')
    expect(formatDepth(-10)).toBe('0 px')
  })
})

describe('rankTitle (The Bearing)', () => {
  it.each([
    [0, 'common'],
    [100, 'common'],
    [101, 'uncommon'],
    [180, 'uncommon'],
    [181, 'rare'],
    [250, 'rare'],
    [251, 'deep_cut'],
    [320, 'deep_cut'],
    [321, 'figlion'],
    [500, 'figlion'],
  ])('score %i is %s', (score, tier) => {
    expect(rankTitle(score).tier).toBe(tier)
  })

  it('uses the spec lines', () => {
    expect(rankTitle(200)).toEqual({ tier: 'rare', title: 'Rare.', line: 'Off the visible canvas.' })
    expect(rankTitle(400).line).toBe('Edge of the infinite canvas.')
  })
})
