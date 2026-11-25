import { useCallback, useEffect, useState } from 'react'
import { ensureSession, getCatch, getResults } from '../../lib/api'
import { toApiError, type ApiErrorCode } from '../../lib/errors'
import { gameSlug } from '../../lib/supabase'
import type { CatchResponse, ResultsResponse } from '../../lib/types'

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; code: ApiErrorCode }

/** A read fetched ahead of time. Used once; failures fall back to a normal load. */
interface Primed<T> {
  data: T | null
}

function useRpc<T>(load: () => Promise<T>, primed?: Primed<T>): { state: Loadable<T>; reload: () => void } {
  const [state, setState] = useState<Loadable<T>>(() =>
    primed?.data != null ? { status: 'ready', data: primed.data } : { status: 'loading' },
  )
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    // A primed first render already has its data: use it once. Later reloads always fetch.
    if (nonce === 0 && state.status === 'ready') {
      if (primed) primed.data = null
      return
    }
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
    // `load` closes over nothing that changes; `nonce` is the reload trigger. The initial
    // `state` only decides whether the first run can skip its fetch.
  }, [nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { state, reload }
}

const primedResults: Primed<ResultsResponse> = { data: null }
const primedCatch: Primed<CatchResponse> = { data: null }
let priming = false

/**
 * Fetch results and the Catch while the last reveal is on screen, so Surface can show the results
 * page without a loading frame. Reads only: the server already finished the dive.
 */
export function primeResults(): void {
  if (priming) return
  priming = true
  const slug = gameSlug()
  void (async () => {
    try {
      await ensureSession()
      const [results, theCatch] = await Promise.allSettled([getResults(slug), getCatch(slug)])
      if (results.status === 'fulfilled') primedResults.data = results.value
      if (theCatch.status === 'fulfilled') primedCatch.data = theCatch.value
    } catch {
      // Fall back to the normal load on /results.
    } finally {
      priming = false
    }
  })()
}

export function useResults() {
  return useRpc<ResultsResponse>(() => getResults(gameSlug()), primedResults)
}

export function useCatch() {
  return useRpc<CatchResponse>(() => getCatch(gameSlug()), primedCatch)
}
