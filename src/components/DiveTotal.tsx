import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

interface DiveTotalProps {
  value: number
  format: (value: number) => string
  duration: number
}

export function DiveTotal({ value, format, duration }: DiveTotalProps) {
  const reducedMotion = usePrefersReducedMotion()
  const visual = useRef<HTMLSpanElement>(null)
  const previous = useRef(value)
  const formatted = format(value)

  useLayoutEffect(() => {
    const from = previous.current
    previous.current = value
    if (from >= value || reducedMotion || !visual.current?.animate) return

    const ticks = Math.min(18, value - from)
    const frames = Array.from({ length: ticks + 1 }, (_, tick) => ({
      '--dive-total': JSON.stringify(format(Math.round(from + (value - from) * tick / ticks))),
      easing: 'steps(1, end)',
    }))
    const animation = visual.current.animate(frames, {
      duration,
      easing: 'linear(0, 0.035 19%, 0.4 49%, 0.85 75%, 1 94%, 1)',
    })
    return () => animation.cancel()
  }, [value, format, duration, reducedMotion])

  return (
    <>
      <span className="sr-only">{formatted}</span>
      <span
        ref={visual}
        className="dive-total"
        style={{ '--dive-total': JSON.stringify(formatted) } as CSSProperties}
        aria-hidden
      />
    </>
  )
}
