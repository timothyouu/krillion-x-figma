// Shapes returned by the Supabase RPCs in
// supabase/migrations/20261124000000_figillion_init.sql. Keep in sync with that file.

export type TierKey = 'common' | 'overplayed' | 'uncommon' | 'rare' | 'deep_cut' | 'figlion'

export type GameStatus = 'upcoming' | 'open' | 'closed'

export interface GameInfo {
  slug: string
  title: string
  status: GameStatus
  opens_at: string
  closes_at: string
  round_count: number
  prompt_seconds: number
  countdown_seconds: number
  max_score: number
}

export interface PlayerSummary {
  display_name: string
  figpal_slug: string
  score: number
  depth_m: number
  finished: boolean
  rounds_resolved: number
}

export interface ActiveRound {
  round: number
  theme: string
  text: string
  clock_starts_at: string
  deadline: string
}

export interface ProgressResponse {
  server_now: string
  game: GameInfo
  player: PlayerSummary | null
  active_round: ActiveRound | null
}

export interface StartPromptResponse {
  server_now: string
  round: number
  round_count: number
  theme: string
  text: string
  clock_starts_at: string
  deadline: string
  resolved: boolean
}

export interface RoundOutcome {
  round: number
  resolved: boolean
  accepted: boolean
  timed_out: boolean
  answer: string | null
  your_input: string | null
  tier: TierKey | null
  tier_label: string | null
  tier_description: string | null
  points: number
  depth_m: number
}

export interface RoundResolvedResponse extends RoundOutcome {
  player: PlayerSummary
}

export interface SubmitRejectedResponse {
  accepted: false
  reason: 'empty' | 'no_echo'
  input: string
  server_now: string
  deadline: string
}

export type SubmitResponse = SubmitRejectedResponse | (RoundResolvedResponse & { accepted: true })

export interface HistogramBucket {
  from: number
  to: number
  count: number
}

/** A results round always has round/theme/prompt; the outcome fields are absent if never started. */
export type ResultsRound = { round: number; theme: string; prompt: string } & Partial<RoundOutcome>

export interface ResultsResponse {
  player: PlayerSummary
  rank: number
  finished_count: number
  better_than_pct: number
  max_score: number
  histogram: HistogramBucket[]
  rounds: ResultsRound[]
}

export interface CatchAnswer {
  answer: string
  tier: TierKey
  tier_label: string
  points: number
  fun_fact: string | null
  yours: boolean
}

export interface CatchRound {
  round: number
  theme: string
  prompt: string
  answers: CatchAnswer[] | null
}

export interface CatchResponse {
  rounds: CatchRound[]
}

export interface LeaderboardRow {
  rank: number
  display_name: string
  figpal_slug: string
  score: number
  depth_m: number
  rounds_done: number
  finished: boolean
}

export interface LeaderboardMe {
  rank: number
  score: number
  depth_m: number
  rounds_done: number
  finished: boolean
}

export interface LeaderboardResponse {
  server_now: string
  total_players: number
  finished: number
  diving: number
  rows: LeaderboardRow[]
  me: LeaderboardMe | null
}
