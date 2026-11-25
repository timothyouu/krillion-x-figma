import { describe, expect, it } from 'vitest'
import { diveReducer, initialDiveState, type DiveState } from './diveMachine'
import type { ProgressResponse, RoundResolvedResponse, StartPromptResponse } from '../../lib/types'

// Synthetic fixtures only: prompt and answer strings here are placeholders, not game content.
const T0 = Date.parse('2026-12-08T18:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()

function game(status: 'open' | 'closed' | 'upcoming' = 'open'): ProgressResponse['game'] {
  return {
    slug: 'practice',
    title: 'Practice',
    status,
    opens_at: iso(T0 - 86_400_000),
    closes_at: iso(T0 + 86_400_000),
    round_count: 5,
    prompt_seconds: 25,
    countdown_seconds: 3,
    max_score: 500,
  }
}

function player(overrides: Partial<NonNullable<ProgressResponse['player']>> = {}): NonNullable<ProgressResponse['player']> {
  return { display_name: 'Ada', figpal_slug: 'capybara', score: 0, depth_m: 0, finished: false, rounds_resolved: 0, ...overrides }
}

function progress(overrides: Partial<ProgressResponse> = {}): ProgressResponse {
  return { server_now: iso(T0), game: game(), player: player(), active_round: null, ...overrides }
}

function startResponse(round: number, serverNow = T0): StartPromptResponse {
  return {
    server_now: iso(serverNow),
    round,
    round_count: 5,
    theme: 'Theme',
    text: 'PROMPT_PLACEHOLDER',
    clock_starts_at: iso(serverNow + 3000),
    deadline: iso(serverNow + 28_000),
    resolved: false,
  }
}

function resolved(round: number, overrides: Partial<RoundResolvedResponse> = {}): RoundResolvedResponse {
  return {
    round,
    resolved: true,
    accepted: true,
    timed_out: false,
    answer: 'ANSWER_PLACEHOLDER',
    your_input: 'answer_placeholder',
    tier: 'rare',
    tier_label: 'Rare',
    tier_description: 'Power-user territory.',
    points: 60,
    depth_m: 600,
    player: player({ score: 60, depth_m: 600, rounds_resolved: round }),
    ...overrides,
  }
}

function run(state: DiveState, ...events: Parameters<typeof diveReducer>[1][]): DiveState {
  return events.reduce(diveReducer, state)
}

describe('diveReducer: loading and resume', () => {
  it('auto-starts round 1 for a fresh player who just pressed Begin Descent', () => {
    const s = run(initialDiveState, { type: 'progress_loaded', progress: progress(), offsetMs: 0, nowMs: T0, autoStart: true })
    expect(s.phase).toBe('starting')
    expect(s.round).toBe(1)
    expect(s.figpalSlug).toBe('capybara')
  })

  it('waits on a Descend button when a fresh player arrives without autoStart', () => {
    const s = run(initialDiveState, { type: 'progress_loaded', progress: progress(), offsetMs: 0, nowMs: T0, autoStart: false })
    expect(s.phase).toBe('between')
  })

  it('resumes between rounds at rounds_resolved + 1', () => {
    const s = run(initialDiveState, {
      type: 'progress_loaded',
      progress: progress({ player: player({ rounds_resolved: 2, score: 90, depth_m: 900 }) }),
      offsetMs: 0,
      nowMs: T0,
      autoStart: true,
    })
    expect(s.phase).toBe('between')
    expect(s.round).toBe(3)
    expect(s.score).toBe(90)
    expect(s.pips).toEqual(['done', 'done', 'pending', 'pending', 'pending'])
  })

  it('resumes an active round mid-clock from the server deadline', () => {
    const active = { round: 2, theme: 'T', text: 'PROMPT_PLACEHOLDER', clock_starts_at: iso(T0 - 5000), deadline: iso(T0 + 20_000) }
    const s = run(initialDiveState, {
      type: 'progress_loaded',
      progress: progress({ player: player({ rounds_resolved: 1 }), active_round: active }),
      offsetMs: 0,
      nowMs: T0,
      autoStart: false,
    })
    expect(s.phase).toBe('answering')
    expect(s.round).toBe(2)
    expect(s.prompt?.deadlineMs).toBe(T0 + 20_000)
  })

  it('requests the prompt again when a preserved pre-migration countdown opens', () => {
    const hidden = { round: 1, theme: '', text: '', clock_starts_at: iso(T0 + 3000), deadline: iso(T0 + 28_000) }
    const counting = run(initialDiveState, {
      type: 'progress_loaded', progress: progress({ active_round: hidden }), offsetMs: 0, nowMs: T0, autoStart: false,
    })
    expect(counting.phase).toBe('countdown')
    const requesting = run(counting, { type: 'tick', nowMs: T0 + 3000 })
    expect(requesting.phase).toBe('starting')
    const answering = run(requesting, {
      type: 'prompt_started', prompt: { ...startResponse(1), text: 'PROMPT_PLACEHOLDER' }, offsetMs: 0, nowMs: T0 + 3000,
    })
    expect(answering.phase).toBe('answering')
    expect(answering.prompt?.deadlineMs).toBe(T0 + 28_000)
  })

  it('goes straight to finishing when a refresh lands after the deadline', () => {
    const active = { round: 1, theme: 'T', text: 'PROMPT_PLACEHOLDER', clock_starts_at: iso(T0 - 30_000), deadline: iso(T0 - 2000) }
    const s = run(initialDiveState, { type: 'progress_loaded', progress: progress({ active_round: active }), offsetMs: 0, nowMs: T0, autoStart: false })
    expect(s.phase).toBe('finishing')
  })

  it('routes finished, unjoined and closed players away', () => {
    const load = (p: ProgressResponse) =>
      diveReducer(initialDiveState, { type: 'progress_loaded', progress: p, offsetMs: 0, nowMs: T0, autoStart: false }).phase
    expect(load(progress({ player: player({ finished: true, rounds_resolved: 5 }) }))).toBe('finished')
    expect(load(progress({ player: null }))).toBe('needs_join')
    expect(load(progress({ game: game('closed') }))).toBe('closed')
  })

  it('applies the server clock offset to deadlines', () => {
    // Server clock runs 10 s ahead of this device.
    const s = run(
      { ...initialDiveState, phase: 'starting' },
      { type: 'prompt_started', prompt: startResponse(1, T0 + 10_000), offsetMs: 10_000, nowMs: T0 },
    )
    expect(s.prompt?.clockStartsAtMs).toBe(T0 + 3000)
    expect(s.prompt?.deadlineMs).toBe(T0 + 28_000)
    expect(s.phase).toBe('countdown')
  })
})

describe('diveReducer: a round', () => {
  const started = run(
    { ...initialDiveState, phase: 'starting' },
    { type: 'prompt_started', prompt: startResponse(1), offsetMs: 0, nowMs: T0 },
  )

  it('counts down, then opens the answer window when the server clock starts', () => {
    expect(started.phase).toBe('countdown')
    expect(run(started, { type: 'tick', nowMs: T0 + 2999 }).phase).toBe('countdown')
    expect(run(started, { type: 'tick', nowMs: T0 + 3000 }).phase).toBe('answering')
  })

  it('ignores submissions during the countdown and blank submissions', () => {
    expect(run(started, { type: 'submit', answer: 'x' }).phase).toBe('countdown')
    const answering = run(started, { type: 'tick', nowMs: T0 + 4000 })
    expect(run(answering, { type: 'submit', answer: '   ' }).phase).toBe('answering')
  })

  it('no echo returns to answering with the message and a new attempt key', () => {
    const s = run(
      started,
      { type: 'tick', nowMs: T0 + 4000 },
      { type: 'submit', answer: 'nope' },
      { type: 'rejected', input: 'nope' },
    )
    expect(s.phase).toBe('answering')
    expect(s.noEcho).toBe('nope')
    expect(s.attempt).toBe(1)
  })

  it('accepted answer reveals, fills the pip with the tier and updates the score', () => {
    const s = run(started, { type: 'tick', nowMs: T0 + 4000 }, { type: 'submit', answer: 'x' }, { type: 'resolved', result: resolved(1) })
    expect(s.phase).toBe('reveal')
    expect(s.pips[0]).toBe('rare')
    expect(s.score).toBe(60)
    expect(s.depthM).toBe(600)
    expect(s.reveal?.points).toBe(60)
  })

  it('time up moves to finishing, and a timeout reveal marks the pip as a miss', () => {
    const late = run(started, { type: 'tick', nowMs: T0 + 4000 }, { type: 'tick', nowMs: T0 + 28_000 })
    expect(late.phase).toBe('finishing')
    const s = run(late, {
      type: 'resolved',
      result: resolved(1, { accepted: false, timed_out: true, answer: null, tier: null, tier_label: null, points: 0, depth_m: 0 }),
    })
    expect(s.phase).toBe('reveal')
    expect(s.pips[0]).toBe('miss')
    expect(s.reveal?.accepted).toBe(false)
  })

  it('a server time_up error while checking moves to finishing', () => {
    const s = run(started, { type: 'tick', nowMs: T0 + 4000 }, { type: 'submit', answer: 'x' }, { type: 'time_up' })
    expect(s.phase).toBe('finishing')
  })

  it('a start response for an already-resolved round triggers a resync', () => {
    const s = run({ ...initialDiveState, phase: 'starting' }, {
      type: 'prompt_started',
      prompt: { ...startResponse(1), resolved: true },
      offsetMs: 0,
      nowMs: T0,
    })
    expect(s.phase).toBe('loading')
  })
})

describe('diveReducer: descend and surface', () => {
  it('descend starts the next round and clears the reveal', () => {
    const s = run({ ...initialDiveState, phase: 'reveal', round: 2, reveal: null }, { type: 'descend' })
    expect(s.phase).toBe('starting')
    expect(s.round).toBe(3)
    expect(s.prompt).toBeNull()
  })

  it('descend remembers the caught answer, tier and theme for the next descent', () => {
    const answering = run(
      { ...initialDiveState, phase: 'starting', round: 2 },
      { type: 'prompt_started', prompt: startResponse(2), offsetMs: 0, nowMs: T0 + 4000 },
    )
    const s = run(answering, { type: 'submit', answer: 'x' }, { type: 'resolved', result: resolved(2) }, { type: 'descend' })
    expect(s.previous).toEqual({ round: 2, theme: 'Theme', answer: 'ANSWER_PLACEHOLDER', tier: 'rare' })
  })

  it('a timed-out round is remembered with no answer', () => {
    const answering = run(
      { ...initialDiveState, phase: 'starting', round: 1 },
      { type: 'prompt_started', prompt: startResponse(1), offsetMs: 0, nowMs: T0 + 4000 },
    )
    const timedOut = resolved(1, { accepted: false, timed_out: true, answer: null, tier: null, points: 0 })
    const s = run(answering, { type: 'time_up' }, { type: 'resolved', result: timedOut }, { type: 'descend' })
    expect(s.previous).toEqual({ round: 1, theme: 'Theme', answer: null, tier: null })
  })

  it('after the last round, descend (Surface) finishes the dive', () => {
    const s = run({ ...initialDiveState, phase: 'reveal', round: 5 }, { type: 'descend' })
    expect(s.phase).toBe('finished')
  })

  it('failures go to error and retry resyncs', () => {
    const failed = run(initialDiveState, { type: 'failed', code: 'network' })
    expect(failed.phase).toBe('error')
    expect(run(failed, { type: 'retry' }).phase).toBe('loading')
  })
})
