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

- iteration 3 | typecheck ok, 52/52 tests, build ok, ALL SMOKE CHECKS PASSED, E2E PASSED (42), three browser dives with zero console errors | Overplayed tier and cursor stamp, typography comparison, and motion verified. Tablet captures exposed sticker overlap with the title and rules line.
- iteration 4 | typecheck ok, 52/52 tests, build ok, ALL SMOKE CHECKS PASSED, E2E PASSED (42), 1280 × 832 and 768 × 832 full dives with zero console errors, reduced-motion dive and leaderboard reorder passed | Moved tablet stickers clear of the home text and kept the HUD depth counter tied to server depth. Reveal frame intervals were 16.7 ms (desktop) and 16.8 ms (tablet) at the 95th percentile in Chromium.

- Responsive QA | typecheck ok, 52/52 tests, build ok, 13 full Chromium dives with zero responsive assertions or console errors, 320 × 568 through 3440 × 1440 | Fixed clipped onboarding and picker focus, compact answer and reveal layouts, Catch scroll position, touch target sizes, and ultrawide ruler placement. Upcoming and closed panels used browser response fixtures.

- Answer window | typecheck ok, 53/53 tests, build ok, ANSWER WINDOW CHECKS PASSED, ALL SMOKE CHECKS PASSED, E2E PASSED (42), full Chromium dive with zero console errors | The countdown now precedes prompt delivery. The server enforces the same 25-second window for scoring and timeout, with the original deadline preserved on refresh.

- Dive motion | typecheck ok, 53/53 tests, build ok, ALL SMOKE CHECKS PASSED, E2E PASSED (42), full Chromium dives at 1280 × 832 and 390 × 844 plus reduced motion at 320 × 568 with zero console errors | Played a full Krillion reference dive and reviewed Oscar’s Figma frames. Added synchronized canvas, ruler, FigPal, and tier motion. The deepest answer traveled about 260 px at desktop and 210 px at phone size. An isolated desktop reveal sampled 16.7 ms at the 95th percentile.

- FigJam motion | typecheck ok, 53/53 tests, build ok, ALL SMOKE CHECKS PASSED, E2E PASSED (42), five full Chromium dives with zero console errors | Full dives passed at 1920 × 1080, 1280 × 832, 768 × 832, 390 × 844, and 320 × 568 with reduced motion. Checked cursor chat, rare connectors, the grouped Surface recap, Catch and leaderboard. The desktop connector draw sampled 16.7 ms at the 95th percentile on the repeat run.

- Motion pass 2 (fix round 1 of 4) | typecheck ok, 58/58 tests, build ok; E2E 41 of 42, only "leaderboard includes me" failing because 61 finished practice players outrank the E2E player in the top-25 board (local data, not code); smoke.sql not run because it needs a freshly reset database | Verdict waits for landing with a stamp contact press; answer pickup, snap-back and carry to the ladder; countdown frame held until the prompt with an in-place wipe; last-5-second urgency and timeout deselect; FigJam-style merged-palm high five with touch hold; compact cursors step aside during the question; results prefetched in the last reveal and a transform-only rise. Headless Chrome 150 at 1280 × 832: every segment p95 16.7–16.8 ms, Surface over-budget frames 14 → 0–3. Dives also passed at 768 × 1024, 390 × 844 touch, and reduced motion with zero console errors.
- Motion pass 2 verifiers | after Tim approved `supabase db reset`: ALL SMOKE CHECKS PASSED, E2E PASSED (42), plus a full dive to results on the clean database with zero console errors | No code changes; the earlier E2E failure was leftover local players.

- FigJam descent | typecheck ok, 58/58 tests, build ok, E2E PASSED (42), ALL SMOKE CHECKS PASSED in a fresh local test cluster, full Chromium dives with zero browser errors at 1280 × 832 and 390 × 844 touch, and 320 × 568 with reduced motion | Added the viewport pan and zoom, sticky-note groups at two speeds, and a selection snap on each countdown. Verified the desktop timeout, Catch, and leaderboard.

- FigJam board variety | typecheck ok, 58/58 tests, build ok, E2E PASSED (42), ALL SMOKE CHECKS PASSED in a fresh local test cluster, full Chromium dives on desktop, mobile touch, and reduced motion with zero browser errors | Replaced the countdown placeholder with Panning…, verified five distinct arrangements per dive including after a timeout, and checked that the bundled emoji decode in Chromium. The sequence is based on the player name and round so it survives a canvas remount.
