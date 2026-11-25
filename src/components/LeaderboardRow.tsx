import { formatDepth } from '../lib/tiers'
import type { LeaderboardRow as Row } from '../lib/types'
import { FigPalAvatar } from './FigPalAvatar'
import { Nametag } from './Nametag'
import { Stamp, type StampKind } from './Stamp'

const MAX_DEPTH_M = 5000
const PODIUM: Record<number, StampKind> = { 1: 'star', 2: 'heart', 3: 'thumbs-up' }

interface LeaderboardRowProps {
  row: Row
  roundCount: number
  isMe: boolean
}

/** One diver on the screen-share board: rank, FigPal, name, status, depth line, score. */
export function LeaderboardRow({ row, roundCount, isMe }: LeaderboardRowProps) {
  const podium = PODIUM[row.rank]
  const depthPct = Math.min(1, row.depth_m / MAX_DEPTH_M) * 100
  return (
    <li
      className={`relative grid grid-cols-[48px_44px_minmax(0,1fr)_auto] items-center gap-3 border bg-paper px-3 py-2 sm:grid-cols-[64px_56px_minmax(0,1fr)_minmax(0,220px)_110px] sm:gap-5 sm:px-5 ${
        isMe ? 'border-2 border-select' : 'border-line'
      }`}
    >
      <span className="relative flex items-center justify-center font-mono text-[22px] tabular sm:text-[28px]">
        {podium ? <Stamp kind={podium} size={44} rotate={-8} className="absolute opacity-90" /> : null}
        <span className={podium ? 'relative rounded-[4px] bg-paper/80 px-1' : ''}>{row.rank}</span>
      </span>
      <FigPalAvatar slug={row.figpal_slug} width={44} decorative />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[18px] sm:text-[24px]">{row.display_name}</span>
        <span className="flex items-center gap-2 font-mono text-[12px] uppercase">
          {row.finished ? (
            <span className="text-ink-soft">surfaced</span>
          ) : (
            <span className="flex items-center gap-1.5 text-select">
              <span className="size-1.5 rounded-full bg-select animate-live" aria-hidden />
              diving {row.rounds_done}/{roundCount}
            </span>
          )}
        </span>
      </span>
      <span className="hidden flex-col gap-1.5 sm:flex" aria-hidden>
        <span className="h-[5px] w-full overflow-hidden rounded-[20px] bg-line">
          <span className="block h-full rounded-[20px] bg-mute transition-[width] duration-700" style={{ width: `${depthPct}%` }} />
        </span>
        <span className="font-mono text-[13px] text-mute tabular">{formatDepth(row.depth_m)}</span>
      </span>
      <span className="text-right font-mono text-[24px] tabular sm:text-[32px]">{row.score}</span>
      {isMe ? (
        <Nametag tone="select" className="absolute -top-3 left-4">
          you
        </Nametag>
      ) : null}
    </li>
  )
}
