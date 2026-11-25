import { useCallback, useEffect, useReducer, useRef } from 'react'
import { ensureSession, finishPrompt, getMyProgress, startPrompt, submitAnswer } from '../../lib/api'
import { ApiError, toApiError } from '../../lib/errors'
import { gameSlug } from '../../lib/supabase'
import { diveReducer, initialDiveState, type DiveState } from './diveMachine'

const TICK_MS = 100
const FINISH_RETRY_MS = 700
const FINISH_MAX_TRIES = 6

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface DiveControls {
  state: DiveState
  submit: (answer: string) => void
  start: () => void
  descend: () => void
  retry: () => void
}

/** Drives the dive: loads progress, starts prompts, ticks the clock, submits and finishes. */
export function useDive(autoStart: boolean): DiveControls {
  const [state, dispatch] = useReducer(diveReducer, initialDiveState)
  const slug = gameSlug()
  const stateRef = useRef(state)
  stateRef.current = state

  // loading: (re)sync with the server. Also the resume path after a refresh.
  useEffect(() => {
    if (state.phase !== 'loading') return
    let cancelled = false
    ;(async () => {
      try {
        await ensureSession()
        const { data, offsetMs } = await getMyProgress(slug)
        if (!cancelled) dispatch({ type: 'progress_loaded', progress: data, offsetMs, nowMs: Date.now(), autoStart })
      } catch (err) {
        if (!cancelled) dispatch({ type: 'failed', code: toApiError(err).code })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [state.phase, slug, autoStart])

  // starting: ask the server for this round's prompt (idempotent on the server).
  useEffect(() => {
    if (state.phase !== 'starting') return
    let cancelled = false
    ;(async () => {
      try {
        const { data, offsetMs } = await startPrompt(slug, state.round)
        if (!cancelled) dispatch({ type: 'prompt_started', prompt: data, offsetMs, nowMs: Date.now() })
      } catch (err) {
        if (cancelled) return
        const code = toApiError(err).code
        // Out of sync with the server (double tab, stale state): resync instead of failing.
        if (code === 'round_in_progress' || code === 'round_out_of_order') dispatch({ type: 'retry' })
        else dispatch({ type: 'failed', code })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [state.phase, state.round, slug])

  // countdown / answering: tick the deadline-driven clock.
  useEffect(() => {
    if (state.phase !== 'countdown' && state.phase !== 'answering') return
    const id = window.setInterval(() => dispatch({ type: 'tick', nowMs: Date.now() }), TICK_MS)
    return () => window.clearInterval(id)
  }, [state.phase])

  // finishing: time ran out with nothing accepted. The server allows this from deadline - 1 s.
  useEffect(() => {
    if (state.phase !== 'finishing') return
    let cancelled = false
    ;(async () => {
      for (let attempt = 1; attempt <= FINISH_MAX_TRIES; attempt += 1) {
        try {
          const result = await finishPrompt(slug, state.round)
          if (!cancelled) dispatch({ type: 'resolved', result })
          return
        } catch (err) {
          const apiErr = toApiError(err)
          if (cancelled) return
          if (apiErr.code !== 'time_not_up' || attempt === FINISH_MAX_TRIES) {
            dispatch({ type: 'failed', code: apiErr.code })
            return
          }
          await wait(FINISH_RETRY_MS)
          if (cancelled) return
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [state.phase, state.round, slug])

  const submit = useCallback(
    (answer: string) => {
      const current = stateRef.current
      const trimmed = answer.trim()
      if (current.phase !== 'answering' || trimmed === '') return
      const round = current.round
      dispatch({ type: 'submit', answer: trimmed })
      ;(async () => {
        try {
          const { data } = await submitAnswer(slug, round, trimmed)
          if (data.accepted) dispatch({ type: 'resolved', result: data })
          else dispatch({ type: 'rejected', input: data.input || trimmed })
        } catch (err) {
          const code = err instanceof ApiError ? err.code : toApiError(err).code
          if (code === 'time_up') dispatch({ type: 'time_up' })
          else if (code === 'round_already_resolved') dispatch({ type: 'retry' })
          else dispatch({ type: 'failed', code })
        }
      })()
    },
    [slug],
  )

  const start = useCallback(() => dispatch({ type: 'start' }), [])
  const descend = useCallback(() => dispatch({ type: 'descend' }), [])
  const retry = useCallback(() => dispatch({ type: 'retry' }), [])

  return { state, submit, start, descend, retry }
}
