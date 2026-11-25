import { formatDepth, getTier, isTierKey, rankTitle } from '../../lib/tiers'
import type { HistogramBucket, ResultsResponse } from '../../lib/types'

/** Index of the histogram bucket that holds `score` (last bucket also takes the max). */
export function bucketIndexFor(histogram: readonly HistogramBucket[], score: number): number {
  if (histogram.length === 0) return -1
  const found = histogram.findIndex((b) => score >= b.from && score <= b.to)
  if (found >= 0) return found
  return score < (histogram[0]?.from ?? 0) ? 0 : histogram.length - 1
}

/** "Deeper than 82% of players", or a first-player line when nobody else has finished. */
export function percentileLine(betterThanPct: number, finishedCount: number): string {
  if (finishedCount <= 1) return 'First to zoom out. The curve fills in as others finish.'
  return `Deeper than ${betterThanPct}% of players`
}

/** Plain-text summary for "Copy result". */
export function buildShareText(results: ResultsResponse, gameTitle = 'FIGILLION'): string {
  const { player, max_score: max, rank, finished_count: total } = results
  const bearing = rankTitle(player.score)
  const log = results.rounds
    .map((r) => {
      const tier = isTierKey(r.tier) && r.accepted ? getTier(r.tier).label : 'Nothing landed'
      return `${r.round}. ${tier} +${r.points ?? 0}`
    })
    .join('\n')
  return [
    `${gameTitle} · ${player.score}/${max} · ${formatDepth(player.depth_m)}`,
    `${bearing.title} ${bearing.line}`,
    `Rank ${rank} of ${total}`,
    log,
  ].join('\n')
}
