// What the FigJam board shows during each descent. Pure, so it can be tested and so a remounted
// canvas (refresh, StrictMode) rebuilds the same board for the same player and round.
import { CREW, type CrewMember } from '../../lib/crew'
import { formatDepth } from '../../lib/tiers'
import type { TierKey } from '../../lib/types'
import type { PreviousRound } from './diveMachine'

export type StickyTone = 'yellow' | 'blue' | 'pink' | 'green'
export type BoardEmoji = 'bulb' | 'eyes' | 'flying-saucer' | 'party-popper' | 'raised-hands' | 'rocket'
export type BoardStampKind = 'star' | 'plus-one' | 'question' | 'thumbs-up' | 'heart'

export type BoardItem =
  | { kind: 'sticky'; text: string; note: string; tone: StickyTone }
  | { kind: 'comment'; text: string; author: CrewMember }
  | { kind: 'emoji'; emoji: BoardEmoji }
  | { kind: 'stamp'; tier: TierKey }
  | { kind: 'sticker'; stamp: BoardStampKind }
  | { kind: 'connector' }

export interface DescentBoardModel {
  /** Index of the near and far arrangements, exposed for tests. */
  nearLayout: number
  farLayout: number
  near: BoardItem[]
  far: BoardItem[]
}

export interface DescentBoardInput {
  round: number
  roundCount: number
  playerName: string
  previous: PreviousRound | null
  depthM: number
}

/** Orderings of the three near items. Position changes the tilt and offset each item gets. */
const NEAR_ORDERS = [
  [0, 1, 2],
  [2, 0, 1],
  [1, 2, 0],
  [0, 2, 1],
  [2, 1, 0],
] as const

const FAR_EXTRAS: readonly BoardItem[] = [
  { kind: 'emoji', emoji: 'party-popper' },
  { kind: 'connector' },
  { kind: 'sticker', stamp: 'plus-one' },
  { kind: 'emoji', emoji: 'bulb' },
  { kind: 'sticker', stamp: 'star' },
]

const FAR_ORDERS = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
  [0, 2, 1],
  [1, 0, 2],
] as const

const FIRST_DIVE = ['Good luck!', 'Pan away', 'You got this']
const AFTER_TIMEOUT = ['Next one’s yours', 'Shake it off', 'So close']
const AFTER_SAFE = ['Classic pick', 'Safe landing', 'Same as mine']
const AFTER_GOOD = ['Nice find', 'Ooh, good one', 'Didn’t think of that']
const AFTER_DEEP = ['How did you know that?', 'Deep cut!', 'Teach me']
const CHEERS = ['Deeper!', 'Keep going', 'Watching this one']

const TONE_BY_TIER: Record<TierKey, StickyTone> = {
  common: 'pink',
  overplayed: 'yellow',
  uncommon: 'green',
  rare: 'pink',
  deep_cut: 'blue',
  figlion: 'yellow',
}

const OPENING_EMOJI: readonly BoardEmoji[] = ['eyes', 'rocket', 'raised-hands', 'flying-saucer', 'eyes']

/** FNV-1a: a stable 32-bit hash of the player name. */
export function nameSeed(name: string): number {
  let hash = 0x811c9dc5
  for (const character of name) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

function pick<T>(items: readonly T[], index: number): T {
  const item = items[((index % items.length) + items.length) % items.length]
  if (item === undefined) throw new Error('pick from an empty list')
  return item
}

function reactionLines(previous: PreviousRound | null): readonly string[] {
  if (!previous) return FIRST_DIVE
  if (!previous.tier) return AFTER_TIMEOUT
  if (previous.tier === 'deep_cut' || previous.tier === 'figlion') return AFTER_DEEP
  if (previous.tier === 'uncommon' || previous.tier === 'rare') return AFTER_GOOD
  return AFTER_SAFE
}

function catchSticky({ previous, roundCount }: DescentBoardInput): BoardItem {
  if (!previous) return { kind: 'sticky', text: 'First pan', note: `${roundCount} prompts`, tone: 'yellow' }
  const note = previous.theme || `Prompt ${previous.round}`
  if (!previous.answer || !previous.tier) return { kind: 'sticky', text: 'nothing landed', note, tone: 'blue' }
  return { kind: 'sticky', text: previous.answer, note, tone: TONE_BY_TIER[previous.tier] }
}

function catchMark(input: DescentBoardInput, seed: number): BoardItem {
  const { previous, round } = input
  if (previous?.tier) return { kind: 'stamp', tier: previous.tier }
  if (previous) return { kind: 'sticker', stamp: 'question' }
  return { kind: 'emoji', emoji: pick(OPENING_EMOJI, seed + round) }
}

/**
 * Near group: your last catch, its stamp, and a teammate's comment on it.
 * Far group (wide screens): where you are in the dive and how deep you have gone.
 * The two arrangements advance at different strides (1 and 3, both coprime with 5), so a dive of
 * five rounds sees every arrangement of each, and the pairing between them shifts every round.
 */
export function buildDescentBoard(input: DescentBoardInput): DescentBoardModel {
  const seed = nameSeed(input.playerName)
  const { round, roundCount, depthM } = input
  const nearLayout = (seed + round) % NEAR_ORDERS.length
  const farLayout = ((seed >>> 8) + round * 3) % FAR_ORDERS.length

  const author = pick(CREW, (seed >>> 4) + round * 4)
  const cheerAuthor = pick(CREW, (seed >>> 4) + round * 4 + 5)
  const nearItems: BoardItem[] = [
    catchSticky(input),
    catchMark(input, seed),
    { kind: 'comment', text: pick(reactionLines(input.previous), (seed >>> 12) + round), author },
  ]
  const farItems: BoardItem[] = [
    { kind: 'sticky', text: `Prompt ${round} of ${roundCount}`, note: 'up next', tone: 'blue' },
    { kind: 'sticky', text: formatDepth(depthM), note: 'so far', tone: 'green' },
    round % 2 === 0
      ? { kind: 'comment', text: pick(CHEERS, (seed >>> 16) + round), author: cheerAuthor }
      : pick(FAR_EXTRAS, (seed >>> 20) + round),
  ]

  return {
    nearLayout,
    farLayout,
    near: pick(NEAR_ORDERS, nearLayout).map((index) => nearItems[index] as BoardItem),
    far: pick(FAR_ORDERS, farLayout).map((index) => farItems[index] as BoardItem),
  }
}
