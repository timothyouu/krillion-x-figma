// Deadline-based timer math. The server owns the clock: every countdown is computed from
// the server's clock_starts_at / deadline, corrected for the client's clock offset.

/**
 * Estimated (server clock - client clock) in ms, assuming the server stamped `server_now`
 * halfway through the round trip.
 */
export function offsetFromServerNow(serverNowIso: string, sentAtMs: number, receivedAtMs: number): number {
  const serverMs = Date.parse(serverNowIso)
  if (Number.isNaN(serverMs)) return 0
  const midpoint = sentAtMs + (receivedAtMs - sentAtMs) / 2
  return Math.round(serverMs - midpoint)
}

/** Converts a server timestamp to the client's clock. */
export function serverToLocalMs(serverIso: string, offsetMs: number): number {
  return Date.parse(serverIso) - offsetMs
}

export type ClockPhase = 'countdown' | 'answering' | 'expired'

export interface ClockReading {
  phase: ClockPhase
  /** ms until the clock starts (countdown) or until the deadline (answering); 0 when expired. */
  remainingMs: number
  /** Whole seconds to show: ceil of remaining, so "25" shows for the first second. */
  displaySeconds: number
  /** 1 at the start of answering, 0 at the deadline. */
  fractionLeft: number
}

export function readClock(nowMs: number, clockStartsAtMs: number, deadlineMs: number): ClockReading {
  const answerSpan = Math.max(1, deadlineMs - clockStartsAtMs)
  if (nowMs < clockStartsAtMs) {
    const remainingMs = clockStartsAtMs - nowMs
    return { phase: 'countdown', remainingMs, displaySeconds: Math.ceil(remainingMs / 1000), fractionLeft: 1 }
  }
  if (nowMs < deadlineMs) {
    const remainingMs = deadlineMs - nowMs
    return {
      phase: 'answering',
      remainingMs,
      displaySeconds: Math.ceil(remainingMs / 1000),
      fractionLeft: Math.min(1, remainingMs / answerSpan),
    }
  }
  return { phase: 'expired', remainingMs: 0, displaySeconds: 0, fractionLeft: 0 }
}

/** Two-digit display for the seven-segment timer. */
export function twoDigits(seconds: number): string {
  const clamped = Math.max(0, Math.min(99, Math.floor(seconds)))
  return clamped.toString().padStart(2, '0')
}
