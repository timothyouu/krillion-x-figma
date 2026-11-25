// Typed wrappers, one per RPC (specs.md 9.3). The game's prompts and answers only ever
// arrive through these responses; nothing about them lives in the frontend.
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from './supabase'
import { ApiError, toApiError } from './errors'
import { offsetFromServerNow } from './clock'
import type {
  CatchResponse,
  LeaderboardResponse,
  PlayerSummary,
  ProgressResponse,
  ResultsResponse,
  RoundResolvedResponse,
  StartPromptResponse,
  SubmitResponse,
} from './types'

/** A response plus the client-to-server clock offset measured on this call. */
export interface Timed<T> {
  data: T
  offsetMs: number | null
}

function requireClient(): SupabaseClient {
  const client = getSupabase()
  if (!client) throw new ApiError('not_configured')
  return client
}

let sessionPromise: Promise<void> | null = null

/** Signs in anonymously once per browser; the session persists in localStorage. */
export function ensureSession(): Promise<void> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const client = requireClient()
      const { data } = await client.auth.getSession()
      if (data.session) return
      const { error } = await client.auth.signInAnonymously()
      if (error) throw new ApiError('auth_failed', error.message)
    })().catch((err: unknown) => {
      sessionPromise = null
      throw toApiError(err)
    })
  }
  return sessionPromise
}

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<Timed<T>> {
  const client = requireClient()
  const sentAt = Date.now()
  let result: { data: unknown; error: { message: string } | null }
  try {
    result = await client.rpc(fn, args)
  } catch (err) {
    throw toApiError(err)
  }
  const receivedAt = Date.now()
  if (result.error) {
    const apiErr = toApiError(result.error)
    // Session lost (storage cleared, token revoked): let the next ensureSession() sign in again.
    if (apiErr.code === 'not_signed_in') sessionPromise = null
    throw apiErr
  }
  const data = result.data as T
  const serverNow =
    typeof data === 'object' && data !== null && 'server_now' in data
      ? String((data as { server_now: unknown }).server_now)
      : null
  return { data, offsetMs: serverNow ? offsetFromServerNow(serverNow, sentAt, receivedAt) : null }
}

export function getMyProgress(gameSlug: string): Promise<Timed<ProgressResponse>> {
  return callRpc('get_my_progress', { p_game_slug: gameSlug })
}

export async function joinGame(gameSlug: string, displayName: string, figpalSlug: string) {
  const { data } = await callRpc<PlayerSummary>('join_game', {
    p_game_slug: gameSlug,
    p_display_name: displayName,
    p_figpal_slug: figpalSlug,
  })
  return data
}

export function startPrompt(gameSlug: string, round: number): Promise<Timed<StartPromptResponse>> {
  return callRpc('start_prompt', { p_game_slug: gameSlug, p_round: round })
}

export function submitAnswer(gameSlug: string, round: number, answer: string): Promise<Timed<SubmitResponse>> {
  return callRpc('submit_answer', { p_game_slug: gameSlug, p_round: round, p_answer: answer })
}

export async function finishPrompt(gameSlug: string, round: number): Promise<RoundResolvedResponse> {
  const { data } = await callRpc<RoundResolvedResponse>('finish_prompt', { p_game_slug: gameSlug, p_round: round })
  return data
}

export async function getResults(gameSlug: string): Promise<ResultsResponse> {
  const { data } = await callRpc<ResultsResponse>('get_results', { p_game_slug: gameSlug })
  return data
}

export async function getCatch(gameSlug: string): Promise<CatchResponse> {
  const { data } = await callRpc<CatchResponse>('get_catch', { p_game_slug: gameSlug })
  return data
}

export async function getLeaderboard(gameSlug: string, limit = 25): Promise<LeaderboardResponse> {
  const { data } = await callRpc<LeaderboardResponse>('get_leaderboard', { p_game_slug: gameSlug, p_limit: limit })
  return data
}
