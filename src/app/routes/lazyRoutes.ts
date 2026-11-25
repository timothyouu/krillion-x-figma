// Routes played after the dive (results) or on the host's screen (leaderboard) load on demand.
// The loaders are shared so the dive can start fetching the results chunk before Surface.

let resultsChunk: ReturnType<typeof importResults> | null = null

function importResults() {
  return import('./ResultsRoute')
}

export function loadResultsRoute() {
  resultsChunk ??= importResults()
  return resultsChunk
}

export function loadLeaderboardRoute() {
  return import('./LeaderboardRoute')
}
