import { describe, expect, it } from 'vitest'
import { offsetFromServerNow, readClock, serverToLocalMs, twoDigits } from './clock'

const T0 = Date.parse('2026-12-08T18:00:00.000Z')

describe('offsetFromServerNow', () => {
  it('measures the server lead against the request midpoint', () => {
    // Request took 200 ms; server stamped T0 + 5,100 at the midpoint (T0 + 100 locally).
    expect(offsetFromServerNow(new Date(T0 + 5100).toISOString(), T0, T0 + 200)).toBe(5000)
  })

  it('handles a server behind the client', () => {
    expect(offsetFromServerNow(new Date(T0 - 2000).toISOString(), T0, T0)).toBe(-2000)
  })

  it('returns 0 for an unparseable timestamp', () => {
    expect(offsetFromServerNow('not a date', T0, T0)).toBe(0)
  })
})

describe('serverToLocalMs', () => {
  it('shifts server time onto the local clock', () => {
    expect(serverToLocalMs(new Date(T0 + 10_000).toISOString(), 10_000)).toBe(T0)
  })
})

describe('readClock', () => {
  const starts = T0 + 3000
  const deadline = T0 + 28_000

  it('counts down 3, 2, 1 before the clock starts', () => {
    expect(readClock(T0, starts, deadline)).toMatchObject({ phase: 'countdown', displaySeconds: 3 })
    expect(readClock(T0 + 1001, starts, deadline).displaySeconds).toBe(2)
    expect(readClock(T0 + 2999, starts, deadline).displaySeconds).toBe(1)
  })

  it('shows 25 for the first second of answering and drains the bar', () => {
    const first = readClock(starts, starts, deadline)
    expect(first).toMatchObject({ phase: 'answering', displaySeconds: 25, fractionLeft: 1 })
    const half = readClock(starts + 12_500, starts, deadline)
    expect(half.displaySeconds).toBe(13)
    expect(half.fractionLeft).toBeCloseTo(0.5)
    expect(readClock(deadline - 1, starts, deadline).displaySeconds).toBe(1)
  })

  it('expires exactly at the deadline', () => {
    expect(readClock(deadline, starts, deadline)).toEqual({ phase: 'expired', remainingMs: 0, displaySeconds: 0, fractionLeft: 0 })
  })
})

describe('twoDigits', () => {
  it('pads and clamps', () => {
    expect(twoDigits(5)).toBe('05')
    expect(twoDigits(25)).toBe('25')
    expect(twoDigits(-1)).toBe('00')
    expect(twoDigits(120)).toBe('99')
  })
})
