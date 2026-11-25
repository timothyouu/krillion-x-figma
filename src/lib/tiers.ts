import type { TierKey } from './types'
import dotStamp from '../assets/stamps/dot.png'
import overplayedStamp from '../assets/stamps/overplayed.svg'
import thumbsUpStamp from '../assets/stamps/thumbs-up.png'
import heartStamp from '../assets/stamps/heart.png'
import plusOneStamp from '../assets/stamps/plus-one.png'
import starStamp from '../assets/stamps/star.png'
import thumbsDownStamp from '../assets/stamps/thumbs-down.png'

export interface TierInfo {
  key: TierKey
  label: string
  /** Lowercase word-mark, as Oscar sets them in the assets section. */
  word: string
  points: number
  description: string
  /** Sampled from the tier's stamp; used for pips, bars and the dive log. */
  color: string
  stamp: string
}

// Mirrors public.tiers. The server stays the source of truth for labels in responses.
export const TIERS: readonly TierInfo[] = [
  { key: 'common', label: 'Common', word: 'common', points: 10, description: 'The answer everyone blurts out.', color: '#ffa5dc', stamp: dotStamp },
  { key: 'overplayed', label: 'Overplayed', word: 'overplayed', points: 15, description: "The 'obscure' pick plenty of others thought of too.", color: '#ff9e42', stamp: overplayedStamp },
  { key: 'uncommon', label: 'Uncommon', word: 'uncommon', points: 30, description: 'Solid. Real Figma users know this one.', color: '#14ae5c', stamp: thumbsUpStamp },
  { key: 'rare', label: 'Rare', word: 'rare', points: 60, description: 'Power-user territory.', color: '#ff7262', stamp: heartStamp },
  { key: 'deep_cut', label: 'Deep Cut', word: 'deep cut', points: 85, description: 'Seriously deep in the docs.', color: '#9747ff', stamp: plusOneStamp },
  { key: 'figlion', label: 'Figlion', word: 'figlion', points: 100, description: 'One in a Figillion.', color: '#ffc700', stamp: starStamp },
] as const

export const NO_ECHO = { word: 'not on the board', color: '#0d99ff', stamp: thumbsDownStamp } as const

const BY_KEY: ReadonlyMap<TierKey, TierInfo> = new Map(TIERS.map((t) => [t.key, t]))

export function isTierKey(value: unknown): value is TierKey {
  return typeof value === 'string' && BY_KEY.has(value as TierKey)
}

export function getTier(key: TierKey): TierInfo {
  const tier = BY_KEY.get(key)
  if (!tier) throw new Error(`Unknown tier: ${key}`)
  return tier
}

export const METRES_PER_POINT = 10

/**
 * Every point pans you 10 px further down the FigJam board. The server still calls this
 * `depth_m`; players see it as canvas pixels.
 */
export function depthFromPoints(points: number): number {
  return Math.max(0, points) * METRES_PER_POINT
}

/** "2,350 px" (0 shows as "0 px"). */
export function formatDepth(pixels: number): string {
  return `${Math.max(0, Math.round(pixels)).toLocaleString('en-US')} px`
}

export interface RankTitle {
  tier: TierKey
  title: string
  line: string
}

const RANK_BANDS: readonly { max: number; title: RankTitle }[] = [
  { max: 100, title: { tier: 'common', title: 'Common.', line: 'Plenty of board left.' } },
  { max: 180, title: { tier: 'uncommon', title: 'Uncommon.', line: 'Panning with the crowd.' } },
  { max: 250, title: { tier: 'rare', title: 'Rare.', line: 'Off the visible canvas.' } },
  { max: 320, title: { tier: 'deep_cut', title: 'Deep Cut.', line: 'Seriously deep pan.' } },
]

const TRENCH: RankTitle = { tier: 'figlion', title: 'Figlion.', line: 'Edge of the infinite canvas.' }

/** The Bearing: rank title by score band (specs.md 3.1). */
export function rankTitle(score: number): RankTitle {
  for (const band of RANK_BANDS) {
    if (score <= band.max) return band.title
  }
  return TRENCH
}
