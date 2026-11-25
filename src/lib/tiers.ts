import type { TierKey } from './types'
import dotStamp from '../assets/stamps/dot.png'
import questionStamp from '../assets/stamps/question.png'
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
  { key: 'too_clever', label: 'Too Clever', word: 'too clever', points: 15, description: 'The "obscure" pick that everyone else thought of too.', color: '#f24e1e', stamp: questionStamp },
  { key: 'uncommon', label: 'Uncommon', word: 'uncommon', points: 30, description: 'Solid. Real Figma users know this one.', color: '#14ae5c', stamp: thumbsUpStamp },
  { key: 'rare', label: 'Rare', word: 'rare', points: 60, description: 'Power-user territory.', color: '#ff7262', stamp: heartStamp },
  { key: 'deep_cut', label: 'Deep Cut', word: 'deep cut', points: 85, description: 'Seriously deep in the docs.', color: '#9747ff', stamp: plusOneStamp },
  { key: 'figlion', label: 'Figlion', word: 'figlion', points: 100, description: 'One in a Figillion.', color: '#ffc700', stamp: starStamp },
] as const

export const NO_ECHO = { word: 'no echo', color: '#0d99ff', stamp: thumbsDownStamp } as const

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

/** Every point sinks you 10 metres. */
export function depthFromPoints(points: number): number {
  return Math.max(0, points) * METRES_PER_POINT
}

/** "-2,350 m" (0 shows as "0 m"). */
export function formatDepth(metres: number): string {
  const rounded = Math.round(metres)
  if (rounded === 0) return '0 m'
  return `-${rounded.toLocaleString('en-US')} m`
}

export interface RankTitle {
  tier: TierKey
  title: string
  line: string
}

const RANK_BANDS: readonly { max: number; title: RankTitle }[] = [
  { max: 100, title: { tier: 'common', title: 'Common.', line: 'Plenty of ocean left.' } },
  { max: 180, title: { tier: 'uncommon', title: 'Uncommon.', line: 'Swimming with the school.' } },
  { max: 250, title: { tier: 'rare', title: 'Rare.', line: 'Below the thermocline.' } },
  { max: 320, title: { tier: 'deep_cut', title: 'Deep Cut.', line: 'Seriously deep dive.' } },
]

const TRENCH: RankTitle = { tier: 'figlion', title: 'Figlion.', line: 'Trench dweller.' }

/** The Bearing: rank title by score band (specs.md 3.1). */
export function rankTitle(score: number): RankTitle {
  for (const band of RANK_BANDS) {
    if (score <= band.max) return band.title
  }
  return TRENCH
}
