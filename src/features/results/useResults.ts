import { useCallback, useEffect, useState } from 'react'
import { ensureSession, getCatch, getResults } from '../../lib/api'
import { toApiError, type ApiErrorCode } from '../../lib/errors'
import { gameSlug } from '../../lib/supabase'
import type { CatchResponse, ResultsResponse } from '../../lib/types'

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; code: ApiErrorCode }

function useRpc<T>(load: () => Promise<T>): { state: Loadable<T>; reload: () => void } {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    ;(async () => {
      try {
        await ensureSession()
        const data = await load()
        if (!cancelled) setState({ status: 'ready', data })
      } catch (err) {
        if (!cancelled) setState({ status: 'error', code: toApiError(err).code })
      }
    })()
    return () => {
      cancelled = true
    }
    // `load` closes over nothing that changes; `nonce` is the reload trigger.
  }, [nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { state, reload }
}

export function useResults() {
  return useRpc<ResultsResponse>(() => getResults(gameSlug()))
}

export function useCatch() {
  return useRpc<CatchResponse>(() => getCatch(gameSlug()))
}
