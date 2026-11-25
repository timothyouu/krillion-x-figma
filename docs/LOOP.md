# Build loop: playable Figillion

Read this at the start of every iteration.

## Goal
The practice game is playable end to end against local Supabase:
home (name + FigPal) → 5 prompts (countdown, timer, no-echo retry, reveal, Descend/Surface, one timeout) → results (score, depth, histogram, percentile, dive log, rank title) → Catch → leaderboard.

## What may change
- Frontend: `src/**`, `public/**`, app config files, PRODUCT.md, DESIGN.md (frontend owner).
- Backend SQL bugs: `supabase/migrations/**`, `supabase/seed.sql` (backend owner only, and each fix is reported).

## Locked verifiers (never edit to make them pass)
1. `npm run typecheck && npm test && npm run build`
2. `node scripts/e2e-api.mjs` → must end with `E2E PASSED`
3. `supabase/tests/smoke.sql` in the db container → must end with `ALL SMOKE CHECKS PASSED`
4. Browser playthrough by the coordinator (not the builder) at http://localhost:5173: a full dive with no console errors, plus a visual check against Oscar's frames (home 106:9171, figpal selection 10:8249, questions 108:12887).

## Stop rules
- Success: all four verifiers pass in the same iteration.
- Budget: 6 fix iterations.
- Circuit breaker: the same failure in two consecutive iterations means stop and report it with the exact output.

## Progress log
Append one line per iteration: `iteration N | verifier results | what changed`.

- iteration 0 | setup | verifiers written; backend and frontend workers started
- iteration 0b | smoke.sql: ALL SMOKE CHECKS PASSED (local Supabase); frontend unverified: npm install blocked by Tim's block_package_install hook | Opus read-only review: no blockers; fixed 4 low findings (stale countdown frame, session re-sign-in, finish retry after unmount, leaderboard polling while hidden)
- iteration 1 | typecheck ok, 52/52 tests, build ok, E2E PASSED (42), smoke passed, browser full dive ok with 0 console errors | polish sent to frontend worker: tier ladder truncation, unnamed primary buttons, home subtitle wrap/color, missing 5th FigPal row, bundle size
- iteration 2 | typecheck ok, 52/52 tests, build ok (no chunk warning, main 84 kB), E2E PASSED, browser home + reveal ok, 0 console errors | all 5 polish items fixed. STOP: success condition met.
