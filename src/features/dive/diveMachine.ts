// The /dive state machine (specs.md 8.2) as a pure reducer. Side effects (RPC calls,
// navigation, ticking) live in useDive; this file only decides what state comes next.
//
// loading → between | starting → countdown → answering ─┬─ submit → checking ─┬─ accepted → reveal
//                                                       │                     └─ no echo → answering
//                                                       └─ time up → finishing → reveal (nothing landed)
// reveal → descend → starting (next round)   reveal (last round) → descend → finished (/results)
import { readClock, serverToLocalMs } from '../../lib/clock'
import type { ApiErrorCode } from '../../lib/errors'
import { isTierKey } from '../../lib/tiers'
import type { ProgressResponse, RoundResolvedResponse, StartPromptResponse, TierKey } from '../../lib/types'

export type PipState = TierKey | 'miss' | 'done' | 'pending'

export interface DivePrompt {
  round: number
  theme: string
  text: string
  /** Local-clock ms (already corrected for server offset). */
  clockStartsAtMs: number
  deadlineMs: number
}

export interface RevealData {
  round: number
  accepted: boolean
  answer: string | null
  yourInput: string | null
  tier: TierKey | null
  tierLabel: string | null
  tierDescription: string | null
  points: number
  depthM: number
}

/** What the player just caught, kept through the next descent so the canvas can show it. */
export interface PreviousRound {
  round: number
  theme: string
  answer: string | null
  tier: TierKey | null
}

export type DivePhase =
  | 'loading'
  | 'needs_join'
  | 'closed'
  | 'finished'
  | 'between'
  | 'starting'
  | 'countdown'
  | 'answering'
  | 'checking'
  | 'finishing'
  | 'reveal'
  | 'error'

export interface DiveState {
  phase: DivePhase
  round: number
  roundCount: number
  countdownSeconds: number
  prompt: DivePrompt | null
  /** The last input that matched nothing; cleared when a new round starts. */
  noEcho: string | null
  /** Increments on every rejected answer so the input can refocus and clear. */
  attempt: number
  reveal: RevealData | null
  /** The round before this one, or null on the first round and after a refresh. */
  previous: PreviousRound | null
  score: number
  depthM: number
  maxScore: number
  pips: PipState[]
  displayName: string
  figpalSlug: string
  offsetMs: number
  error: ApiErrorCode | null
}

export type DiveEvent =
  | { type: 'progress_loaded'; progress: ProgressResponse; offsetMs: number | null; nowMs: number; autoStart: boolean }
  | { type: 'start' }
  | { type: 'prompt_started'; prompt: StartPromptResponse; offsetMs: number | null; nowMs: number }
  | { type: 'tick'; nowMs: number }
  | { type: 'submit'; answer: string }
  | { type: 'rejected'; input: string }
  | { type: 'resolved'; result: RoundResolvedResponse }
  | { type: 'time_up' }
  | { type: 'descend' }
  | { type: 'failed'; code: ApiErrorCode }
  | { type: 'retry' }

export const initialDiveState: DiveState = {
  phase: 'loading',
  round: 1,
  roundCount: 5,
  countdownSeconds: 0,
  prompt: null,
  noEcho: null,
  attempt: 0,
  reveal: null,
  previous: null,
  score: 0,
  depthM: 0,
  maxScore: 500,
  pips: ['pending', 'pending', 'pending', 'pending', 'pending'],
  displayName: '',
  figpalSlug: 'figgy',
  offsetMs: 0,
  error: null,
}

function buildPips(roundCount: number, resolved: number): PipState[] {
  return Array.from({ length: roundCount }, (_, i) => (i < resolved ? 'done' : 'pending'))
}

function toPrompt(
  src: { round: number; theme: string; text: string; clock_starts_at: string; deadline: string },
  offsetMs: number,
): DivePrompt {
  return {
    round: src.round,
    theme: src.theme,
    text: src.text,
    clockStartsAtMs: serverToLocalMs(src.clock_starts_at, offsetMs),
    deadlineMs: serverToLocalMs(src.deadline, offsetMs),
  }
}

/** Which live phase a prompt is in right now. Expired means finish_prompt is due. */
function phaseForPrompt(prompt: DivePrompt, nowMs: number): DivePhase {
  const reading = readClock(nowMs, prompt.clockStartsAtMs, prompt.deadlineMs)
  if (reading.phase === 'countdown') return 'countdown'
  if (reading.phase === 'answering') return prompt.text ? 'answering' : 'starting'
  return 'finishing'
}

function onProgress(state: DiveState, event: Extract<DiveEvent, { type: 'progress_loaded' }>): DiveState {
  const { game, player, active_round: active } = event.progress
  const offsetMs = event.offsetMs ?? state.offsetMs
  const base: DiveState = {
    ...state,
    offsetMs,
    roundCount: game.round_count,
    countdownSeconds: game.countdown_seconds,
    maxScore: game.max_score,
    error: null,
    reveal: null,
    noEcho: null,
    prompt: null,
  }
  if (player?.finished) return { ...base, phase: 'finished' }
  if (game.status !== 'open') return { ...base, phase: 'closed' }
  if (!player) return { ...base, phase: 'needs_join' }

  const withPlayer: DiveState = {
    ...base,
    score: player.score,
    depthM: player.depth_m,
    displayName: player.display_name,
    figpalSlug: player.figpal_slug,
    pips: buildPips(game.round_count, player.rounds_resolved),
  }
  if (active) {
    const prompt = toPrompt(active, offsetMs)
    return { ...withPlayer, round: active.round, prompt, phase: phaseForPrompt(prompt, event.nowMs) }
  }
  const nextRound = Math.min(player.rounds_resolved + 1, game.round_count)
  const fresh = player.rounds_resolved === 0
  return { ...withPlayer, round: nextRound, phase: fresh && event.autoStart ? 'starting' : 'between' }
}

export function diveReducer(state: DiveState, event: DiveEvent): DiveState {
  switch (event.type) {
    case 'progress_loaded':
      return onProgress(state, event)

    case 'start':
      return state.phase === 'between' ? { ...state, phase: 'starting', error: null } : state

    case 'prompt_started': {
      if (state.phase !== 'starting') return state
      const offsetMs = event.offsetMs ?? state.offsetMs
      // A round the server already resolved: resync from get_my_progress.
      if (event.prompt.resolved) return { ...state, offsetMs, phase: 'loading' }
      const prompt = toPrompt(event.prompt, offsetMs)
      return {
        ...state,
        offsetMs,
        round: prompt.round,
        roundCount: event.prompt.round_count,
        prompt,
        noEcho: null,
        phase: phaseForPrompt(prompt, event.nowMs),
      }
    }

    case 'tick': {
      if (!state.prompt) return state
      if (state.phase !== 'countdown' && state.phase !== 'answering') return state
      const next = phaseForPrompt(state.prompt, event.nowMs)
      return next === state.phase ? state : { ...state, phase: next }
    }

    case 'submit':
      if (state.phase !== 'answering' || event.answer.trim() === '') return state
      return { ...state, phase: 'checking' }

    case 'rejected':
      if (state.phase !== 'checking') return state
      return { ...state, phase: 'answering', noEcho: event.input, attempt: state.attempt + 1 }

    case 'time_up':
      return state.phase === 'checking' || state.phase === 'answering' ? { ...state, phase: 'finishing' } : state

    case 'resolved': {
      const r = event.result
      const tier = isTierKey(r.tier) ? r.tier : null
      const pips = state.pips.slice()
      if (r.round >= 1 && r.round <= pips.length) pips[r.round - 1] = r.accepted && tier ? tier : 'miss'
      return {
        ...state,
        phase: 'reveal',
        pips,
        score: r.player.score,
        depthM: r.player.depth_m,
        noEcho: null,
        reveal: {
          round: r.round,
          accepted: r.accepted,
          answer: r.answer,
          yourInput: r.your_input,
          tier,
          tierLabel: r.tier_label,
          tierDescription: r.tier_description,
          points: r.points,
          depthM: r.depth_m,
        },
      }
    }

    case 'descend': {
      if (state.phase !== 'reveal') return state
      if (state.round >= state.roundCount) return { ...state, phase: 'finished' }
      const previous: PreviousRound | null = state.reveal
        ? {
            round: state.reveal.round,
            theme: state.prompt?.theme ?? '',
            answer: state.reveal.accepted ? state.reveal.answer : null,
            tier: state.reveal.accepted ? state.reveal.tier : null,
          }
        : null
      return { ...state, phase: 'starting', round: state.round + 1, prompt: null, reveal: null, noEcho: null, previous }
    }

    case 'failed':
      return { ...state, phase: 'error', error: event.code }

    case 'retry':
      return { ...state, phase: 'loading', error: null }
  }
}
