import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CatchList } from '../../components/CatchList'
import { DiveCanvas } from '../../components/DiveCanvas'
import { DiveLog } from '../../components/DiveLog'
import { ErrorScreen } from '../../components/ErrorScreen'
import { FigButton } from '../../components/FigButton'
import { FigPalAvatar } from '../../components/FigPalAvatar'
import { Nametag } from '../../components/Nametag'
import { ScoreCurve } from '../../components/ScoreCurve'
import { Stamp } from '../../components/Stamp'
import { LoadingScreen } from '../../components/StatusPanel'
import { SURFACE_MS } from '../../features/dive/diveMotion'
import { buildShareText, percentileLine } from '../../features/results/resultsFormat'
import { useCatch, useResults } from '../../features/results/useResults'
import { formatDepth, rankTitle } from '../../lib/tiers'
import type { ResultsResponse } from '../../lib/types'

function Card({ tag, children, className = '' }: { tag: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-[5px] ${className}`}>
      <Nametag>{tag}</Nametag>
      <div className="h-full border border-line bg-paper px-5 py-6 sm:px-8 sm:py-8">{children}</div>
    </section>
  )
}

export function ResultsRoute() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const surfacing = locationState?.surfaced === true
  const { state: results, reload } = useResults()

  useEffect(() => {
    if (results.status !== 'error') return
    if (results.code === 'not_finished') navigate('/dive', { replace: true })
    else if (results.code === 'not_joined') navigate('/', { replace: true })
  }, [results, navigate])

  if (results.status === 'loading') return <LoadingScreen label="zooming out" />
  if (results.status === 'error') {
    if (results.code === 'not_finished' || results.code === 'not_joined') return <LoadingScreen />
    return <ErrorScreen code={results.code} onRetry={reload} />
  }
  return <ResultsView data={results.data} surfacing={surfacing} />
}

function ResultsView({ data, surfacing }: { data: ResultsResponse; surfacing: boolean }) {
  const { player } = data
  const bearing = rankTitle(player.score)

  return (
    <>
      {surfacing ? <DiveCanvas depthM={player.depth_m} round={data.rounds.length} duration={SURFACE_MS} surfacing /> : null}
      <main className="results-surface relative z-10 mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex min-h-11 items-center font-mono text-[22px] tracking-[0.02em] sm:text-[28px]">
            FIGILLION
          </Link>
          <Link
            to="/leaderboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-tag border border-line bg-paper px-3 py-2 text-[15px] font-medium hover:border-select"
          >
            <span className="size-2 rounded-full bg-select animate-live" aria-hidden />
            Live leaderboard
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Card tag="Zoomed out">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FigPalAvatar slug={player.figpal_slug} width={48} className="shrink-0" decorative />
                  <span className="min-w-0 wrap-anywhere text-[18px] text-ink-soft">{player.display_name}</span>
                </div>
                <Stamp hoverable tier={bearing.tier} size={72} rotate={10} press className="shrink-0" />
              </div>
              <dl className="recap-notes" data-surfacing={surfacing}>
                <div className="recap-note recap-note--score">
                  <dt>Score</dt>
                  <dd className="font-mono leading-none">
                    <span className="text-[clamp(2rem,8vw,4.5rem)] tabular">{player.score}</span>
                    <span className="text-[clamp(0.875rem,3vw,1.5rem)] text-ink-soft">/{data.max_score}</span>
                  </dd>
                </div>
                <div className="recap-note recap-note--depth">
                  <dt>Depth</dt>
                  <dd className="font-mono text-[clamp(1rem,3.6vw,1.375rem)] tabular">{formatDepth(player.depth_m)}</dd>
                </div>
                <div className="recap-note recap-note--rank">
                  <dt>Rank</dt>
                  <dd className="font-mono text-[clamp(1rem,3.6vw,1.375rem)] tabular">{data.rank} of {data.finished_count}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-1">
                <p className="text-[26px] leading-tight sm:text-[32px]">
                  {bearing.title} <span className="text-ink-soft">{bearing.line}</span>
                </p>
                <p className="text-[17px] text-ink-soft sm:text-[19px]">
                  {percentileLine(data.better_than_pct, data.finished_count)}
                </p>
              </div>
              <CopyResultButton data={data} />
            </div>
          </Card>

          <Card tag="Everyone’s pan">
            <div className="flex h-full flex-col justify-between gap-4">
              <p className="text-[17px] text-ink-soft">
                {data.finished_count} {data.finished_count === 1 ? 'player has' : 'players have'} zoomed out. You are the blue bar.
              </p>
              <ScoreCurve histogram={data.histogram} score={player.score} maxScore={data.max_score} />
            </div>
          </Card>
        </div>

        <Card tag="Pan log">
          <DiveLog rounds={data.rounds} />
        </Card>

        <CatchSection data={data} />
      </main>
    </>
  )
}

function CopyResultButton({ data }: { data: ResultsResponse }) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(data))
      setCopied('done')
    } catch {
      setCopied('failed')
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      <FigButton onClick={copy} icon="enter">
        Copy result
      </FigButton>
      <span className="text-[15px] text-ink-soft" role="status">
        {copied === 'done' ? 'Copied. Paste it in the chat.' : copied === 'failed' ? 'Copy blocked by the browser.' : ''}
      </span>
    </div>
  )
}

function CatchSection({ data }: { data: ResultsResponse }) {
  const { state, reload } = useCatch()
  return (
    <Card tag="The Board">
      <p className="mb-4 text-[17px] text-ink-soft">Every answer on the board, deepest first.</p>
      {state.status === 'loading' ? <p className="font-mono text-[15px] text-mute">gathering the stickies…</p> : null}
      {state.status === 'error' ? (
        <div className="flex items-center gap-4">
          <p className="text-[16px] text-ink-soft">The board did not load.</p>
          <FigButton variant="quiet" onClick={reload}>
            Retry
          </FigButton>
        </div>
      ) : null}
      {state.status === 'ready' ? <CatchList rounds={state.data.rounds} results={data.rounds} /> : null}
    </Card>
  )
}
