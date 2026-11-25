import type { CSSProperties } from 'react'
import { FALL_CURVE, sinkDurationMs, waypointTime } from '../features/dive/diveMotion'
import { TIERS, formatDepth } from '../lib/tiers'
import type { TierKey } from '../lib/types'
import { FigPalAvatar } from './FigPalAvatar'
import { SelectionFrame } from './SelectionFrame'
import { Stamp } from './Stamp'

interface TierLadderProps {
  tier: TierKey | null
  chipText: string
  figpalSlug: string
}

export function TierLadder({ tier, chipText, figpalSlug }: TierLadderProps) {
  const index = TIERS.findIndex((entry) => entry.key === tier)
  const duration = sinkDurationMs(tier)
  const motion = {
    '--sink-steps': Math.max(0, index + 1),
    '--sink-duration': duration + 'ms',
    '--fall-curve': FALL_CURVE,
  } as CSSProperties

  return (
    <div className="tier-track relative select-none" style={motion}>
      <div className="tier-row flex items-center justify-end border-b border-dashed border-line px-2">
        <span className="font-mono text-[11px] text-mute">surface · 0 m</span>
      </div>
      {tier ? <div className="tier-travel-line" aria-hidden="true" /> : null}
      <ol aria-hidden="true">
        {TIERS.map((entry, i) => {
          const isHit = i === index
          const passed = i <= index
          const connectDepth = isHit && entry.points >= 60
          const rowMotion = {
            '--tier-color': entry.color,
            '--waypoint-delay': (passed ? waypointTime((i + 1) / (index + 1), duration) : 0) + 'ms',
          } as CSSProperties

          return (
            <li
              key={entry.key}
              className="tier-row relative isolate grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 border-b border-dashed border-line pl-[41%] pr-2 lg:grid-cols-[minmax(0,1fr)_auto_66px] lg:gap-2 lg:pl-[36%]"
              style={rowMotion}
            >
              {passed ? <span className={'tier-waypoint' + (isHit ? ' tier-landing' : '')} /> : null}
              <span className="flex min-w-0 items-center gap-1 sm:gap-2">
                <Stamp tier={entry.key} size={28} className={'size-5! shrink-0 sm:size-7! ' + (isHit ? '' : 'opacity-65')} />
                <span className="truncate text-[14px] leading-tight sm:text-[17px] lg:text-[19px]">{entry.word}</span>
              </span>
              <span className="font-mono text-[11px] text-mute tabular">{entry.points}</span>
              <span className={'hidden w-[66px] text-right font-mono text-[11px] tabular lg:inline ' + (connectDepth ? 'text-[#14609c]' : 'text-mute')}>
                {formatDepth(entry.points * 10)}
              </span>
              {connectDepth ? <DepthConnector /> : null}
            </li>
          )
        })}
      </ol>
      <div className={'tier-answer absolute left-1 top-0.5 w-[38%] lg:w-[33%] ' + (tier ? 'tier-sink' : '')}>
        <SelectionFrame className="w-fit max-w-full">
          <span className="flex min-w-0 items-center gap-0.5 bg-paper px-1.5 py-0.5 font-mono text-[13px] leading-[20px] sm:gap-1.5 sm:text-[15px]" title={chipText}>
            {tier ? <FigPalAvatar slug={figpalSlug} width={20} className="shrink-0" decorative /> : null}
            <span className="truncate">{chipText}</span>
          </span>
        </SelectionFrame>
      </div>
    </div>
  )
}

/** The connector runs in the space below the landed chip and tier labels. */
function DepthConnector() {
  return (
    <div className="tier-connector">
      <span className="tier-connector__anchor" />
      <span className="tier-connector__line" />
      <span className="tier-connector__drag">
        <svg viewBox="0 0 20 22" width="13" height="14" fill="none">
          <path d="M2 1.5 18 13l-7.6.5L7 20 2 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="tier-connector__target" />
    </div>
  )
}
