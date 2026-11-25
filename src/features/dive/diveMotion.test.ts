import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearLift, peekLift, pickupTravelMs, rememberLift, sinkDurationMs } from './diveMotion'

describe('answer pickup', () => {
  afterEach(() => {
    clearLift()
    vi.useRealTimers()
  })

  it('hands the lifted answer position to the reveal, and keeps it for repeated reads', () => {
    rememberLift(new DOMRect(120, 640, 180, 34))
    expect(peekLift()).toMatchObject({ x: 120, y: 640, width: 180, height: 34 })
    expect(peekLift()).not.toBeNull()
  })

  it('forgets the position after a rejection', () => {
    rememberLift(new DOMRect(0, 0, 10, 10))
    clearLift()
    expect(peekLift()).toBeNull()
  })

  it('ignores a stale position', () => {
    vi.useFakeTimers({ toFake: ['performance'] })
    rememberLift(new DOMRect(0, 0, 10, 10))
    vi.advanceTimersByTime(6001)
    expect(peekLift()).toBeNull()
  })

  it('keeps the carry between 200 and 300 ms for every tier', () => {
    expect(pickupTravelMs(sinkDurationMs('common'))).toBe(207)
    expect(pickupTravelMs(sinkDurationMs('figlion'))).toBe(300)
  })
})
