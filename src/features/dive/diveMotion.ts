import { TIERS } from '../../lib/tiers'
import type { TierKey } from '../../lib/types'

export const DESCENT_MS = 760
export const SURFACE_MS = 920

// Displacement over time. The same curve moves the answer, canvas, and ruler.
const fallStops = [
  [0, 0],
  [0.13, -0.035],
  [0.29, 0.09],
  [0.52, 0.43],
  [0.71, 0.77],
  [0.88, 1.015],
  [1, 1],
] as const

export const FALL_CURVE = 'linear(' + fallStops.map(([time, distance]) => distance + ' ' + time * 100 + '%').join(', ') + ')'

export function sinkDurationMs(tier: TierKey | null): number {
  const index = TIERS.findIndex((entry) => entry.key === tier)
  return index < 0 ? 0 : 690 + index * 125
}

/** Time at which the chip first reaches a particular ruler row. */
export function waypointTime(distance: number, duration: number): number {
  const nextIndex = fallStops.findIndex(([, position]) => position >= distance)
  const before = fallStops[nextIndex - 1]
  const after = fallStops[nextIndex]
  if (!before || !after) return 0
  const progress = (distance - before[1]) / (after[1] - before[1])
  return Math.round((before[0] + (after[0] - before[0]) * progress) * duration)
}
