import { useLayoutEffect, useState } from 'react'
import { readClock, type ClockReading } from '../../lib/clock'
import type { DivePrompt } from './diveMachine'

const FRAME_MS = 100

/** Live reading of a prompt's server-driven clock, refreshed ~10x per second while active. */
export function useCountdown(prompt: DivePrompt | null, active: boolean): ClockReading | null {
  const [now, setNow] = useState(() => Date.now())

  // Layout effect: refresh `now` before paint, so a new round never shows the previous round's stale time.
  useLayoutEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), FRAME_MS)
    return () => window.clearInterval(id)
  }, [active])

  if (!prompt) return null
  return readClock(now, prompt.clockStartsAtMs, prompt.deadlineMs)
}
