import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { LoadingScreen, StatusPanel } from '../components/StatusPanel'
import { appConfig } from '../lib/config'
import { ConfigErrorScreen } from './ConfigErrorScreen'
import { ClosedRoute } from './routes/ClosedRoute'
import { DiveRoute } from './routes/DiveRoute'
import { HomeRoute } from './routes/HomeRoute'

// Played after the dive (results) or on the host's screen (leaderboard): load on demand.
const ResultsRoute = lazy(() => import('./routes/ResultsRoute').then((m) => ({ default: m.ResultsRoute })))
const LeaderboardRoute = lazy(() => import('./routes/LeaderboardRoute').then((m) => ({ default: m.LeaderboardRoute })))

function NotFound() {
  return (
    <StatusPanel
      tag="404"
      title="Lost at sea."
      body={<p>There is nothing at this depth.</p>}
      figpal="duck"
      stamp="question"
      actions={
        <Link
          to="/"
          className="inline-flex items-center rounded-button border border-line bg-paper p-3 font-mono text-[20px] uppercase leading-none hover:border-select"
        >
          Back to start
        </Link>
      }
    />
  )
}

export function App() {
  if (!appConfig.ok) return <ConfigErrorScreen missing={appConfig.missing} />
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/dive" element={<DiveRoute />} />
          <Route path="/results" element={<ResultsRoute />} />
          <Route path="/leaderboard" element={<LeaderboardRoute />} />
          <Route path="/closed" element={<ClosedRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
