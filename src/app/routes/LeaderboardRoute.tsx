import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FigPalStage } from '../../components/FigPalStage'
import { LeaderboardRow } from '../../components/LeaderboardRow'
import { Stamp } from '../../components/Stamp'
import { usePrefersReducedMotion } from '../../components/usePrefersReducedMotion'
import { loadDraft } from '../../lib/playerDraft'
import { LoadingScreen } from '../../components/StatusPanel'
import { useLeaderboard } from '../../features/leaderboard/useLeaderboard'
import { describeError } from '../../lib/errors'
import type { LeaderboardResponse } from '../../lib/types'

const ROUND_COUNT = 5

/** Screen-share board: top 25, polled every 3 s. */
export function LeaderboardRoute() {
  const { data, error } = useLeaderboard(25)
  // get_leaderboard's "me" has no name; match it to the name this device joined with.
  const [myName] = useState(() => loadDraft().name)

  if (!data && !error) return <LoadingScreen label="counting divers" />

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <Stamp kind="star" size={64} rotate={-10} className="hidden sm:block" />
          <div>
            <Link to="/" className="font-mono text-[40px] leading-none tracking-[0.02em] sm:text-[56px]">
              FIGILLION
            </Link>
            <p className="mt-2 text-[20px] text-ink-soft sm:text-[24px]">Deepest divers, live</p>
          </div>
        </div>
        {data ? <Counts data={data} /> : null}
      </header>

      {error ? (
        <p role="status" className="w-fit rounded-tag border border-line bg-paper px-3 py-2 text-[15px] text-ink-soft">
          {describeError(error).title}. Retrying every 3 seconds{data ? '; showing the last board.' : '.'}
        </p>
      ) : null}

      {data && data.rows.length === 0 ? (
        <section className="flex flex-col items-center gap-6 py-16 text-center">
          <FigPalStage slug="rock" width={120} glow={false} />
          <p className="font-mono text-[28px] sm:text-[36px]">Nobody has dived yet.</p>
          <p className="text-[18px] text-ink-soft">Open the game link and be the first name on the board.</p>
        </section>
      ) : null}

      {data && data.rows.length > 0 ? (
        <RankedRows rows={data.rows} me={data.me} myName={myName} />
      ) : null}

      {data?.me && !data.rows.some((r) => r.rank === data.me?.rank) ? (
        <p className="w-fit rounded-tag border-2 border-select bg-paper px-3 py-2 font-mono text-[16px]">
          you: rank {data.me.rank} · {data.me.score} pts
        </p>
      ) : null}

      <footer className="font-mono text-[12px] uppercase text-mute">updates every 3 seconds</footer>
    </main>
  )
}

function RankedRows({ rows, me, myName }: Pick<LeaderboardResponse, 'rows' | 'me'> & { myName: string }) {
  const list = useRef<HTMLOListElement>(null)
  const previous = useRef(new Map<HTMLElement, number>())
  const reducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    if (!list.current) return

    // Read every resting position before applying any row transforms.
    const positions = new Map(Array.from(list.current.children, (child) => {
      const row = child as HTMLElement
      return [row, row.offsetTop]
    }))
    const before = previous.current
    previous.current = positions
    if (reducedMotion) return

    const animations: Animation[] = []
    for (const [row, top] of positions) {
      const oldTop = before.get(row)
      if (oldTop === undefined || oldTop === top || !row.animate) continue
      animations.push(row.animate(
        [{ transform: 'translateY(' + (oldTop - top) + 'px)' }, { transform: 'translateY(0)' }],
        { duration: 340, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      ))
    }
    return () => animations.forEach((animation) => animation.cancel())
  }, [rows, reducedMotion])

  return (
    <ol ref={list} className="relative flex flex-col gap-2" aria-label="Leaderboard">
      {rows.map((row, index) => (
        <LeaderboardRow
          key={row.row_id ?? index}
          row={row}
          roundCount={ROUND_COUNT}
          isMe={Boolean(me && me.rank === row.rank && me.score === row.score && row.display_name === myName)}
        />
      ))}
    </ol>
  )
}

function Counts({ data }: { data: LeaderboardResponse }) {
  return (
    <dl className="flex flex-wrap gap-2" aria-live="polite">
      <Count label="divers" value={data.total_players} />
      <Count label="surfaced" value={data.finished} />
      <Count label="still diving" value={data.diving} live />
    </dl>
  )
}

function Count({ label, value, live = false }: { label: string; value: number; live?: boolean }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <dt className="flex w-fit items-center gap-1.5 rounded-tag border border-line bg-paper px-2.5 py-[5px] text-[15px] font-medium leading-none">
        {live ? <span className="size-2 rounded-full bg-select animate-live" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="min-w-[120px] border border-line bg-paper px-4 py-2 font-mono text-[32px] leading-none tabular sm:text-[40px]">
        {value}
      </dd>
    </div>
  )
}
