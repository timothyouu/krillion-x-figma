import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorScreen } from '../../components/ErrorScreen'
import { LoadingScreen, StatusPanel } from '../../components/StatusPanel'
import { ensureSession, getMyProgress } from '../../lib/api'
import { toApiError, type ApiErrorCode } from '../../lib/errors'
import { gameSlug } from '../../lib/supabase'
import type { GameInfo } from '../../lib/types'

const linkClass =
  'inline-flex items-center rounded-button border border-line bg-paper p-3 font-mono text-[20px] uppercase leading-none hover:border-select'

export function formatOpening(iso: string, locale?: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

type Load = { status: 'loading' } | { status: 'ready'; game: GameInfo } | { status: 'error'; code: ApiErrorCode }

/** Upcoming or closed game. Sends players back in if the game is actually open. */
export function ClosedRoute() {
  const navigate = useNavigate()
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensureSession()
        const { data } = await getMyProgress(gameSlug())
        if (cancelled) return
        if (data.player?.finished) navigate('/results', { replace: true })
        else if (data.game.status === 'open') navigate('/', { replace: true })
        else setLoad({ status: 'ready', game: data.game })
      } catch (err) {
        if (!cancelled) setLoad({ status: 'error', code: toApiError(err).code })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, nonce])

  if (load.status === 'loading') return <LoadingScreen label="checking the board" />
  if (load.status === 'error') return <ErrorScreen code={load.code} onRetry={() => setNonce((n) => n + 1)} />

  const { game } = load
  if (game.status === 'upcoming') {
    return (
      <StatusPanel
        tag="Not open yet"
        title="The water opens soon."
        body={
          <p>
            {game.title} opens <span className="font-mono text-ink">{formatOpening(game.opens_at)}</span>. Keep this tab
            handy and come back then.
          </p>
        }
        stamp="star"
        figpal="rock"
        actions={
          <button type="button" className={linkClass} onClick={() => setNonce((n) => n + 1)}>
            Check again
          </button>
        }
      />
    )
  }
  return (
    <StatusPanel
      tag="Board closed"
      title="This board is closed."
      body={
        <p>
          {game.title} closed <span className="font-mono text-ink">{formatOpening(game.closes_at)}</span>. The final board
          is still up.
        </p>
      }
      stamp="thumbs-down"
      figpal="rock"
      actions={
        <Link to="/leaderboard" className={linkClass}>
          See the leaderboard
        </Link>
      }
    />
  )
}
