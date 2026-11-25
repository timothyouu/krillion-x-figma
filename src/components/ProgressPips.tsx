import type { PipState } from '../features/dive/diveMachine'
import { getTier, isTierKey } from '../lib/tiers'

interface ProgressPipsProps {
  pips: readonly PipState[]
  current: number
}

function pipLabel(pip: PipState, index: number): string {
  const n = index + 1
  if (isTierKey(pip)) return `Prompt ${n}: ${getTier(pip).label}`
  if (pip === 'miss') return `Prompt ${n}: nothing landed`
  if (pip === 'done') return `Prompt ${n}: done`
  return `Prompt ${n}: not yet`
}

/** One pip per prompt, filled with the tier color it landed in. */
export function ProgressPips({ pips, current }: ProgressPipsProps) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Pan progress">
      {pips.map((pip, i) => {
        const isCurrent = i + 1 === current && pip === 'pending'
        let fill = 'transparent'
        if (isTierKey(pip)) fill = getTier(pip).color
        else if (pip === 'done') fill = '#7b7b7b'
        return (
          <li
            key={i}
            title={pipLabel(pip, i)}
            aria-label={pipLabel(pip, i)}
            className={`size-3 rounded-[3px] border ${isCurrent ? 'border-select border-2' : pip === 'miss' ? 'border-mute border-dashed' : 'border-line'}`}
            style={{ backgroundColor: fill === 'transparent' ? '#ffffff' : fill }}
          />
        )
      })}
    </ol>
  )
}
