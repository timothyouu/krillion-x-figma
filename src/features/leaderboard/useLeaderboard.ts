import { useEffect, useState } from 'react'
import { getLeaderboard } from '../../lib/api'
import { getSupabase, gameSlug } from '../../lib/supabase'
import { toApiError, type ApiErrorCode } from '../../lib/errors'
import type { LeaderboardResponse } from '../../lib/types'

export const LEADERBOARD_POLL_MS = 3000
/** Hidden tabs keep polling, just slower: a screen-shared board can report "hidden" while still on screen. */
export const LEADERBOARD_HIDDEN_POLL_MS = 15000

export interface LeaderboardState {
  data: LeaderboardResponse | null
  error: ApiErrorCode | null
  /** Local time of the last successful poll. */
  updatedAt: number | null
}

/** Polls get_leaderboard every 3 s (no Realtime, see specs.md 10); every 15 s while the tab is hidden. */
export function useLeaderboard(limit = 25): LeaderboardState {
  const [state, setState] = useState<LeaderboardState>({ data: null, error: null, updatedAt: null })

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let inFlight = false

    const nextDelay = () =>
      document.visibilityState === 'hidden' ? LEADERBOARD_HIDDEN_POLL_MS : LEADERBOARD_POLL_MS

    const poll = async () => {
      // One request at a time; a running poll schedules the next one itself.
      if (inFlight) return
      inFlight = true
      timer = undefined
      try {
        // Signed-in players also get their own rank ("me"); anon visitors still see the board.
        await getSupabase()?.auth.getSession()
        const data = await getLeaderboard(gameSlug(), limit)
        if (!cancelled) setState({ data, error: null, updatedAt: Date.now() })
      } catch (err) {
        if (!cancelled) setState((prev) => ({ ...prev, error: toApiError(err).code }))
      } finally {
        inFlight = false
      }
      if (!cancelled) timer = window.setTimeout(poll, nextDelay())
    }

    // Coming back to the tab refreshes right away instead of waiting out the slow interval.
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || cancelled || inFlight) return
      if (timer !== undefined) window.clearTimeout(timer)
      void poll()
    }

    void poll()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [limit])

  return state
}
