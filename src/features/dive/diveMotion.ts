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

/** Delay after landing before the verdict lines rise, then the gap between lines. */
export const VERDICT_LEAD_MS = 140
export const VERDICT_STAGGER_MS = 50

export interface LiftOrigin {
  x: number
  y: number
  width: number
  height: number
  at: number
}

const LIFT_TTL_MS = 6000
let liftOrigin: LiftOrigin | null = null

/** The answer box records where the picked-up answer hovers while the server checks it. */
export function rememberLift(rect: DOMRect): void {
  liftOrigin = { x: rect.left, y: rect.top, width: rect.width, height: rect.height, at: performance.now() }
}

/** A rejected answer drops back into the box, so there is nothing left to carry. */
export function clearLift(): void {
  liftOrigin = null
}

/**
 * Where the reveal's answer chip flies in from. Reading does not consume it, so StrictMode's
 * repeated effects see the same origin; the next pickup or a rejection replaces it.
 */
export function peekLift(): LiftOrigin | null {
  if (!liftOrigin || performance.now() - liftOrigin.at > LIFT_TTL_MS) return null
  return liftOrigin
}

/** How long the chip takes to travel from the answer box to the surface row. */
export function pickupTravelMs(sinkMs: number): number {
  return Math.round(Math.min(300, Math.max(200, sinkMs * 0.3)))
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
