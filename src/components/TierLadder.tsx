import { useEffect, useState } from 'react'
import { TIERS, formatDepth } from '../lib/tiers'
import type { TierKey } from '../lib/types'
import { SelectionFrame } from './SelectionFrame'
import { Stamp } from './Stamp'

const ROW_PX = 44
const SURFACE_PX = 40

/** Sink time grows with depth: the deeper the tier, the longer the fall. 0 for a miss. */
export function sinkDurationMs(tier: TierKey | null): number {
  const index = tier ? TIERS.findIndex((t) => t.key === tier) : -1
  return index < 0 ? 0 : 650 + index * 170
}

interface TierLadderProps {
  tier: TierKey | null
  /** Text on the sinking chip: the canonical answer, or "nothing landed". */
  chipText: string
  reducedMotion: boolean
}

/**
 * The reveal's signature moment: the answer chip sinks past each tier line and stops at the
 * tier it landed in. A miss never leaves the surface.
 */
export function TierLadder({ tier, chipText, reducedMotion }: TierLadderProps) {
  const index = tier ? TIERS.findIndex((t) => t.key === tier) : -1
  const [landed, setLanded] = useState(reducedMotion || index < 0)
  const duration = reducedMotion ? 0 : sinkDurationMs(tier)

  useEffect(() => {
    if (landed) return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setLanded(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [landed])

  const targetY = index < 0 ? 0 : SURFACE_PX + index * ROW_PX
  const chipY = (landed ? targetY : 0) + 6

  return (
    <div className="relative select-none" style={{ height: SURFACE_PX + TIERS.length * ROW_PX }}>
      <div className="flex items-center justify-end border-b border-dashed border-line pr-1" style={{ height: SURFACE_PX }}>
        <span className="font-mono text-[12px] text-mute">surface · 0 m</span>
      </div>
      <ol aria-hidden>
        {TIERS.map((t, i) => {
          const isHit = i === index
          return (
            <li
              key={t.key}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-dashed border-line pl-[35%] pr-1"
              style={{
                height: ROW_PX,
                backgroundColor: isHit ? `${t.color}2e` : 'transparent',
                transition: `background-color 300ms ease ${duration}ms`,
              }}
            >
              <span className="flex items-center gap-2.5">
                <Stamp tier={t.key} size={28} className={`shrink-0 ${isHit ? '' : 'opacity-55'}`} />
                <span className={`whitespace-nowrap text-[18px] leading-none sm:text-[20px] ${isHit ? 'text-ink' : 'text-ink-soft'}`}>
                  {t.word}
                </span>
              </span>
              <span className="font-mono text-[12px] text-mute tabular">{t.points}</span>
              <span className="hidden w-[66px] text-right font-mono text-[12px] text-mute tabular lg:inline">
                {formatDepth(t.points * 10)}
              </span>
            </li>
          )
        })}
      </ol>
      <div
        className="absolute left-0 top-0 w-[33%]"
        style={{
          transform: `translateY(${chipY}px)`,
          transition: `transform ${duration}ms var(--ease-sink)`,
        }}
      >
        <SelectionFrame className="w-fit max-w-full">
          <span className="block truncate bg-paper px-2.5 py-1 font-mono text-[15px] leading-[22px] sm:text-[17px]" title={chipText}>
            {chipText}
          </span>
        </SelectionFrame>
      </div>
    </div>
  )
}
