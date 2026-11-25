import type { CSSProperties } from 'react'
import { TIERS, formatDepth } from '../lib/tiers'
import type { TierKey } from '../lib/types'
import { SelectionFrame } from './SelectionFrame'
import { Stamp } from './Stamp'

const ROW_PX = 44
const SURFACE_PX = 40

/** Sink time grows with depth: the deeper the tier, the longer the fall. 0 for a miss. */
export function sinkDurationMs(tier: TierKey | null): number {
  const index = tier ? TIERS.findIndex((t) => t.key === tier) : -1
  return index < 0 ? 0 : 520 + index * 80
}

interface TierLadderProps {
  tier: TierKey | null
  /** Text on the sinking chip: the canonical answer, or "nothing landed". */
  chipText: string
}

/**
 * The reveal's signature moment: the answer chip sinks past each tier line and stops at the
 * tier it landed in. A miss never leaves the surface.
 */
export function TierLadder({ tier, chipText }: TierLadderProps) {
  const index = tier ? TIERS.findIndex((t) => t.key === tier) : -1
  const targetY = index < 0 ? 0 : SURFACE_PX + index * ROW_PX
  const motion = {
    height: SURFACE_PX + TIERS.length * ROW_PX,
    '--sink-distance': targetY + 'px',
    '--sink-duration': sinkDurationMs(tier) + 'ms',
  } as CSSProperties

  return (
    <div className="relative select-none" style={motion}>
      <div className="flex items-center justify-end border-b border-dashed border-line pr-1" style={{ height: SURFACE_PX }}>
        <span className="font-mono text-[12px] text-mute">surface · 0 m</span>
      </div>
      <ol aria-hidden>
        {TIERS.map((t, i) => {
          const isHit = i === index
          return (
            <li
              key={t.key}
              className="relative isolate grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-dashed border-line pl-[33%] pr-1 lg:grid-cols-[minmax(0,1fr)_auto_66px] lg:gap-3 lg:pl-[35%]"
              style={{ height: ROW_PX }}
            >
              {isHit ? <span className="tier-landing absolute inset-0 -z-10" style={{ backgroundColor: t.color + '2e' }} /> : null}
              <span className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
                <Stamp tier={t.key} size={28} className={`size-[22px]! shrink-0 sm:size-7! ${isHit ? '' : 'opacity-55'}`} />
                <span className={`truncate text-[16px] leading-tight sm:text-[18px] lg:text-[20px] ${isHit ? 'text-ink' : 'text-ink-soft'}`}>
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
      <div className={'absolute left-0 top-[6px] w-[31%] lg:w-[33%] ' + (index < 0 ? '' : 'tier-sink')}>
        <SelectionFrame className="w-fit max-w-full">
          <span className="block truncate bg-paper px-2.5 py-1 font-mono text-[15px] leading-[22px] sm:text-[17px]" title={chipText}>
            {chipText}
          </span>
        </SelectionFrame>
      </div>
    </div>
  )
}
