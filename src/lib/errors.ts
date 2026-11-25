// Error messages raised by the RPCs (supabase-setup.md section 9), plus client-side codes.
export const RPC_ERROR_CODES = [
  'game_not_found',
  'game_not_open',
  'not_signed_in',
  'not_joined',
  'invalid_display_name',
  'invalid_figpal',
  'invalid_round',
  'round_out_of_order',
  'round_in_progress',
  'round_not_started',
  'round_already_resolved',
  'time_up',
  'time_not_up',
  'too_many_attempts',
  'not_finished',
  'prompt_missing',
] as const

export type RpcErrorCode = (typeof RPC_ERROR_CODES)[number]
export type ApiErrorCode = RpcErrorCode | 'not_configured' | 'network' | 'auth_failed' | 'unknown'

const KNOWN = new Set<string>(RPC_ERROR_CODES)

export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, detail?: string) {
    super(detail ?? code)
    this.name = 'ApiError'
    this.code = code
  }
}

/** Pulls a known RPC code out of a raw error message (Postgres raise text). */
export function codeFromMessage(message: string | undefined | null): ApiErrorCode {
  const text = (message ?? '').trim()
  if (KNOWN.has(text)) return text as RpcErrorCode
  for (const code of RPC_ERROR_CODES) {
    if (text.includes(code)) return code
  }
  if (/fetch|network|failed to fetch|load failed/i.test(text)) return 'network'
  return 'unknown'
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof Error) return new ApiError(codeFromMessage(err.message), err.message)
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = String((err as { message: unknown }).message)
    return new ApiError(codeFromMessage(message), message)
  }
  return new ApiError('unknown', String(err))
}

/** Player-facing copy for an error code. Names the problem and the way out. */
export function describeError(code: ApiErrorCode): { title: string; body: string } {
  switch (code) {
    case 'game_not_open':
      return { title: 'The dive is closed', body: 'This game is not open right now. Check the time with your host.' }
    case 'game_not_found':
      return { title: 'No such game', body: 'This link points at a game that does not exist. Ask your host for the right link.' }
    case 'invalid_display_name':
      return { title: 'Check your name', body: 'Names need 1 to 24 characters.' }
    case 'invalid_figpal':
      return { title: 'Pick a FigPal', body: 'Choose one of the FigPals before you dive.' }
    case 'not_joined':
      return { title: 'You have not joined yet', body: 'Head back to the start, pick a name and a FigPal, then dive.' }
    case 'not_signed_in':
    case 'auth_failed':
      return { title: 'Could not start a session', body: 'Your browser could not sign in. Refresh the page; if it keeps failing, try another browser.' }
    case 'too_many_attempts':
      return { title: 'Out of tries', body: 'That was 30 guesses on one prompt. Wait for the clock to run out.' }
    case 'network':
      return { title: 'Connection lost', body: 'We could not reach the game server. Check your connection and try again.' }
    case 'not_configured':
      return { title: 'Not configured', body: 'This build has no game server configured.' }
    default:
      return { title: 'Something went wrong', body: 'The game server returned an error. Try again in a moment.' }
  }
}
