import type { CSSProperties } from 'react'
import { formatDepth, getTier, isTierKey } from '../lib/tiers'
import type { ResultsRound } from '../lib/types'
import { Stamp } from './Stamp'

interface DiveLogProps {
  rounds: readonly ResultsRound[]
}

const MAX_DROP_M = 1000
const DROP_PX = 180

/** Per-prompt dive log: each prompt is a line dropped from the surface to the depth it reached. */
export function DiveLog({ rounds }: DiveLogProps) {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-mute" aria-hidden />
      <ol className="grid grid-cols-5 gap-2 sm:gap-4">
        {rounds.map((r) => {
          const tier = r.accepted && isTierKey(r.tier) ? getTier(r.tier) : null
          const depth = r.depth_m ?? 0
          const drop = tier ? Math.max(18, (Math.min(depth, MAX_DROP_M) / MAX_DROP_M) * DROP_PX) : 10
          return (
            <li key={r.round} className="flex min-w-0 flex-col items-center">
              <div className="relative flex w-full flex-col items-center" style={{ height: DROP_PX + 44, '--chart-delay': (r.round - 1) * 42 + 'ms' } as CSSProperties} aria-hidden>
                <div
                  className={`dive-log-line w-[3px] rounded-b-[2px] ${tier ? '' : 'border-l-2 border-dashed border-mute bg-transparent'}`}
                  style={{ height: drop, backgroundColor: tier ? tier.color : undefined }}
                />
                <Stamp
                  tier={tier ? tier.key : 'no_echo'}
                  size={40}
                  rotate={r.round % 2 === 0 ? 8 : -8}
                  className={`dive-log-stamp absolute -translate-y-1/2 ${tier ? '' : 'opacity-70'}`}
                  style={{ top: drop + 4, '--drop-start': -drop * 0.88 + 'px' } as CSSProperties}
                />
              </div>
              <p className="font-mono text-[12px] text-mute">P{r.round}</p>
              <p className="w-full truncate text-center font-mono text-[14px] sm:text-[15px]" title={r.answer ?? undefined}>
                {tier ? r.answer : '—'}
              </p>
              <p className="text-center text-[13px] text-ink-soft tabular">
                {tier ? `+${r.points ?? 0} · ${formatDepth(depth)}` : 'nothing landed'}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
