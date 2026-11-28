# Figillion: Spec

A Figma-themed take on [Krillion](https://krillion.io), built by the Figma Campus Leader Social Team as the icebreaker for the Midyear All Hands on **Tuesday, Dec 8, 2026**. Repo: `timothyouu/krillion-x-figma` (**public**, which matters for section 7).

Status: draft v3 (Nov 24, 2026). Backend setup for Chris: [supabase-setup.md](supabase-setup.md). Target: **playable end to end today**, polished before Dec 8. Items marked **OPEN** are in section 13.

---

## 1. Goals and non-goals

**Goals**
- Up to **220 Campus Leaders** join from one shared link, each play 5 prompts, and see where they rank.
- Reward obscure Figma knowledge the way Krillion does: rarer correct answers sink you deeper.
- A live leaderboard the host can screen-share during the call.
- Desktop and tablet first. Phone works but isn't the design target.
- **The answer key never reaches a browser before the player has finished**, and never sits in the public repo.

**Non-goals (v1)**
- Accounts, emails, profiles, display-name moderation.
- Host-controlled pacing (play is self-paced).
- Rarity computed from live player answers (Ankita pre-assigns tiers).
- An admin UI for editing questions.
- A multiplayer "room" mode like Krillion's Puffer Party (hot-potato rooms of 2 to 10 players; doesn't fit 220 people).

## 2. What we learned playing Krillion (Nov 24)

I played a full Unlimited dive on krillion.io in Chrome and read the official how-to and FAQ. What we're copying:

| Krillion behavior | Detail |
|---|---|
| Rules line | "7 prompts · 25 seconds each · rarer answers sink deeper". Ours: **5 prompts · 25 seconds · rarer answers dive deeper**. |
| Countdown | Prompt text appears with "descending · the clock starts in 3…1" before the 25 s clock starts. |
| Input | One text box ("type one answer…"), a **Dive** button, Enter submits, circular timer beside the input. |
| Rejected answer | Inline message `"ramne": no echo. try again`. The clock keeps running and **you can retry until time is up**. |
| Typos | One-letter typos are autocorrected ("bonbo" → Bonobo). A two-letter swap ("ramne") is rejected. |
| Accepted answer | The answer card sinks past horizontal tier lines (PLANKTON · 10, … ONE IN A KRILLION · 100) and stops at its tier. |
| Reveal card | Tier name, canonical answer, `+10 PTS · sink 100m`, and a one-line description of the tier ("The answer everyone blurts out."). |
| Timeout | `NOTHING LANDED · + 0 PTS · the clock beat you to it.` |
| Between prompts | A **Descend** button; the player controls when the next prompt starts. |
| HUD | Depth (top left), score (top right), a row of progress pips colored by tier (top center), depth markers down the right edge. |
| Last prompt | **Surface** button instead of Descend. |
| Results | Score `/700`, depth, a curve of all players' scores with a **YOU** marker, "better than X% of players", a per-prompt dive log chart, "The Bearing" (rank title by score band), Copy result / Share. |
| The Catch | One row per prompt with your answer and points. Expanding a row lists **every accepted answer with its points**, the top answer first with a fun-fact line. |
| Attempts | "One dive per day. No second chances." |
| Depth | "Every point sinks you 10 metres." |

## 3. Game rules (Figillion)

1. **Join:** open the link, type a display name, pick a FigPal, press **Begin Descent**.
2. **5 prompts**, one per themed round, **25 seconds each**, with a 3-second "descending" countdown before the prompt is revealed and its clock starts.
3. **One scored answer per prompt.** Rejected answers show the "no echo" message and can be retried until time runs out. The first accepted answer locks the prompt.
4. **Reveal** after each prompt (accepted or timed out), then **Descend** for the next one, or **Surface** after prompt 5.
5. **One dive per player.** No replays.
6. **Results** right after finishing, including the Catch (all accepted answers) for every prompt.
7. **Live leaderboard** on its own page for the host to screen-share; finished players can open it too.

### 3.1 Tiers and scoring

| Tier (UI label) | Key | Points | Depth | Description line (draft, Oscar/Ankita can rewrite) |
|---|---|---:|---:|---|
| Common | `common` | 10 | 100 m | The answer everyone blurts out. |
| Overplayed | `overplayed` | 15 | 150 m | The 'obscure' pick plenty of others thought of too. |
| Uncommon | `uncommon` | 30 | 300 m | Solid. Real Figma users know this one. |
| Rare | `rare` | 60 | 600 m | Power-user territory. |
| Deep Cut | `deep_cut` | 85 | 850 m | Seriously deep in the docs. |
| Figlion | `figlion` | 100 | 1,000 m | One in a Figillion. |

- "No echo" is the **rejected-answer message**, not a tier.
- **Depth = points × 10 m.** Max score 500 = **-5,000 m**. Oscar's gauge labels (-100 to -500 m) change to -1,000 to -5,000 m.
- **Ranking:** score descending, then earlier `finished_at`.
- **Rank titles (The Bearing),** Krillion's bands scaled from 700 to 500 points:

| Score | Title |
|---|---|
| 0–100 | Common. Plenty of ocean left. |
| 101–180 | Uncommon. Swimming with the school. |
| 181–250 | Rare. Below the thermocline. |
| 251–320 | Deep Cut. Seriously deep dive. |
| 321+ | Figlion. Trench dweller. |

### 3.2 Answer matching (server side)

1. Normalize input and every answer/alias: lowercase, trim, collapse whitespace, strip punctuation, unify `⌘`/`cmd`/`command`, `ctrl`/`control`, `opt`/`option`/`alt`, and `+`/space separators.
2. Exact match on normalized answer or any alias.
3. Otherwise, for inputs of 5+ characters, accept a match **within 1 edit** (insert, delete or substitute; a transposition counts as 2, as in Krillion). If several match, take the closest; ties go to the rarer tier.
4. No match → `no echo`, nothing stored as a score, player may retry.

## 4. End-to-end flow

Each step shows what the client calls and where the data comes from or goes. "RPC" means a Postgres function called through `supabase.rpc()`.

```
 ┌───────────── Player device (browser) ─────────────┐        ┌──────────── Supabase ────────────┐
 │                                                   │        │                                  │
 1 Open link  ── GET static app ──────────────────────────────▶ Vercel (HTML/JS/CSS + FigPal art)
 2 App boots: signInAnonymously() ───────────────────────────▶ auth.users (anon user)
              session saved in localStorage by supabase-js
 3 get_my_progress('midyear-2026') ──────────────────────────▶ games, players, submissions
     ├ game not open → /closed
     ├ already finished → /results
     └ mid-dive → resume at current prompt
 4 Home: name + FigPal → join_game(...) ─────────────────────▶ players (insert)
 5 Descent countdown ends → start_prompt(round) ────────────▶ prompt_starts (insert, server time)
     ◀── { prompt text, theme, round, deadline }  ◀────────── prompts (read inside RPC only)
     Prompt arrives with the server’s 25 s scoring window already open
 6 Dive → submit_answer(round, text) ───────────────────────▶ accepted_answers (read inside RPC only)
     ├ no match → { accepted:false }  → "no echo. try again"   (attempt logged to submissions)
     └ match    → { tier, points, depth, canonical answer }  → submissions (scored row)
 7 Clock hits 0 with no accepted answer → finish_prompt(round) ▶ submissions (0-point row)
 8 Reveal card (tier animation) → Descend → back to 5 (rounds 2-5)
 9 After round 5 → Surface → get_results() ──────────────────▶ players.finished_at set
     ◀── { score, depth, rank, percentile, histogram, per-round answers }
10 Catch: get_catch() (only allowed when finished) ─────────▶ accepted_answers (all rounds)
11 Leaderboard page: get_leaderboard() polled every 3 s ────▶ leaderboard view
 └───────────────────────────────────────────────────┘        └──────────────────────────────────┘
```

Rules the server enforces (the client only displays):
- `start_prompt` only serves rounds in order and is idempotent: calling it again returns the original deadline, so refreshing doesn't reset the clock.
- The server only accepts answers from `clock_starts_at` up to but excluding `deadline`. The round may time out once that same deadline is reached.
- `get_catch` returns nothing until `players.finished_at` is set.
- Closing the game never strands a player. No new round starts after `closes_at`, but a round already inside its answer window can still be answered. After that the dive finishes, with 0 points for every round the player didn't reach. `get_my_progress`, `submit_answer` and `finish_prompt` apply this, and `private.finalize_game` sweeps up players whose tab is gone.

## 5. Where everything is stored

| Data | Lives in | Who can read it | Who writes it | Never put it in |
|---|---|---|---|---|
| App code, styles, FigPal and brand images | GitHub repo → Vercel static build | Anyone | Timothy | — |
| Ankita's working draft of prompts + answers | **Private Google Sheet** shared only with the team | Team only | Ankita | The public repo, Slack channels with Campus Leaders, the frontend |
| CSV landing rows during an import | Supabase `public.import_prompts` / `public.import_answers` (locked, emptied by `publish_import`) | Chris only (dashboard) | Chris (CSV import) | — |
| Live prompts and themes | Supabase `private.prompts` | **No client read.** Served one at a time by `start_prompt` | `publish_import` | Frontend code, `public/`, JSON files in the repo |
| Accepted answers, aliases, tiers, fun facts | Supabase `private.accepted_answers` | **No client read.** Used inside `submit_answer`; returned by `get_catch` only after the player finishes | `publish_import` | Same as above |
| Tier names, points, description lines | Supabase `public.tiers` (public read), mirrored as constants in `src/lib/tiers.ts` | Anyone | Migration | — |
| Game window (open/close times) | Supabase `public.games` | Anyone (public read) | Chris | — |
| Player name, FigPal, score, finish time | Supabase `private.players` | Name, FigPal and score via `get_leaderboard` | `join_game`, scoring RPCs | — |
| Per-round result and clock (start, deadline, tier, points) | Supabase `private.player_rounds` | Own results via RPCs | RPCs only | — |
| Every typed attempt, including "no echo" | Supabase `private.attempts` | Nobody through the API (Chris can query) | `submit_answer` | — |
| Player session | Browser `localStorage` (supabase-js default) | That browser | supabase-js | — |
| Supabase URL + **anon (publishable)** key | `.env.local` locally, Vercel env vars in prod | Public by design (shipped in the JS bundle) | Chris shares with Timothy | — |
| Supabase **service role** key | Chris's machine / Supabase dashboard only | Chris | — | Vercel, `.env.local`, the repo, any `VITE_` variable |
| Example question file | `supabase/seed/questions.example.json` (fake data only) | Anyone | Timothy | Real prompts or answers |

### 5.1 Why the answer key is safe

- The frontend never has the questions or answers in its code, so **View Source, Inspect, and the Network tab show nothing** until the server hands over one prompt's text when its clock starts.
- Prompts, answers and player data live in a **`private` schema that the Supabase API doesn't expose at all**, with every privilege revoked from `anon`/`authenticated`. A curious player calling the REST API directly with the anon key gets an error, not data.
- Only `security definer` RPCs read those tables, and they return exactly one prompt (`start_prompt`), one verdict (`submit_answer`), or the full Catch after the player has finished (`get_catch`).
- Real content is **gitignored** (`supabase/seed/*.json` except `*.example.json`). The repo is public, so a committed answer file would be readable by anyone, even after deletion from history.
- Accepted risk: a player who finishes early can see the Catch and share answers with people still playing. You chose to show it right after finishing, like Krillion.

### 5.2 Getting Ankita's content into Supabase

1. Ankita fills the private Google Sheet: tab `prompts` (`game_slug, round, theme, prompt`) and tab `answers` (`game_slug, round, answer, aliases, tier, fun_fact`; aliases separated by `|`).
2. Chris downloads each tab as CSV (to his machine, not the repo) and imports them with the dashboard Table Editor into `public.import_prompts` and `public.import_answers`.
3. Chris runs `select private.publish_import('midyear-2026');`. It validates everything (all rounds present, known tiers, at least one figlion per round, no alias matching two answers), then swaps the content in one transaction and clears the landing tables. On any problem it changes nothing and lists every issue.
4. Full steps: [supabase-setup.md](supabase-setup.md) section 7.

The same columns as JSON, used by `questions.example.json` and any local script:

```json
{
  "game": "midyear-2026",
  "rounds": [
    {
      "round": 1,
      "theme": "Shortcuts",
      "prompt": "Name a Figma keyboard shortcut you use every day",
      "answers": [
        { "answer": "Frame tool (F)", "aliases": ["f", "frame"], "tier": "common" },
        { "answer": "Auto layout (Shift A)", "aliases": ["shift a", "auto layout"], "tier": "uncommon" },
        { "answer": "Rename (Cmd R)", "aliases": ["cmd r", "ctrl r", "rename"], "tier": "rare" },
        { "answer": "Pixel preview (Ctrl P)", "aliases": ["pixel preview"], "tier": "figlion",
          "fun_fact": "Shows exactly how a design renders at 1x on a real screen." }
      ]
    }
  ]
}
```

## 6. Team and ownership

| Person | Owns |
|---|---|
| Timothy Ou | Frontend, Figma asset import, reveal/results/leaderboard/closed screen design, Vercel deploy, integration |
| Christian Garcia | Supabase project: review and run the migration, anonymous auth, content import, game window, monitoring on the day |
| Ankita | All prompts and answer lists with tiers, aliases and figlion fun facts, in the private sheet |
| Srishti Jha | **OPEN:** role not assigned |
| Nathan, Oscar | Screens and graphics; Oscar's section is the design target |

## 7. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vite, React (function components and hooks), TypeScript strict, Tailwind CSS |
| Routing | React Router |
| Data | `@supabase/supabase-js` (anonymous auth + RPC). No Realtime (see section 10). |
| Backend | Supabase Postgres, RLS, `security definer` RPCs, anonymous sign-ins |
| Hosting | Vercel static SPA, all routes rewritten to `index.html` |
| Tests | Vitest + React Testing Library; SQL test script for RPCs |
| Design | Figma MCP for assets and tokens |

Packages (need approval when we scaffold): `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, plus the Vite React-TS template defaults.

## 8. Frontend

### 8.1 Routes and screens

| Route | Screen | Design source |
|---|---|---|
| `/` | Home: title, rules line, name input, FigPal picker, Begin Descent | Oscar: `home`, `figpal selection` |
| `/dive` | Countdown → prompt + timer + input → no-echo message → reveal card → Descend/Surface | Oscar: `questions`; reveal by Timothy |
| `/results` | Score /500, depth, score curve with YOU marker, percentile, dive log, rank title, Catch, Copy result | Timothy |
| `/leaderboard` | Top 25 (rank, FigPal, name, score, depth), total divers, divers still underwater | Timothy |
| `/closed` | Game not open yet / closed | Timothy |

### 8.2 Dive state machine (`/dive`)

```
idle → countdown(3s) → answering(25s) ─┬─ submit → checking ─┬─ accepted → reveal
                                        │                     └─ no echo → answering
                                        └─ time up → finish_prompt → reveal(nothing landed)
reveal → Descend → countdown (next round)      reveal(round 5) → Surface → /results
```

- Timer display is driven by the server `deadline`, not a local 25 s count.
- Input disabled while `checking`; Enter submits; input autofocuses each round.
- Progress pips across the top fill with the tier color of each round.

### 8.3 Source layout

```
src/
  app/            router, layout, route components
  components/     DepthGauge, Timer, AnswerInput, FigPalPicker, TierBadge, RevealCard,
                  ProgressPips, ScoreCurve, DiveLog, CatchList, LeaderboardRow
  features/
    dive/         useDive (state machine), useCountdown
    results/      useResults, useCatch
    leaderboard/  useLeaderboard (polling)
  lib/
    supabase.ts   client
    api.ts        typed wrappers, one per RPC in 9.3
    tiers.ts      tier constants (labels, points, colors)
    types.ts      generated Supabase types + app types
  assets/
    figpals/      exported FigPals (slug.svg)
    brand/        logo, backgrounds, dot grid
supabase/
  migrations/     schema, access rules, RPCs
  seed.sql        practice game only (generic prompts, safe to be public)
  seed/           questions.example.json only; real content never lives in the repo
  tests/          smoke.sql (+ local_stubs.sql for plain Postgres)
```

### 8.4 Figma assets

File: [Figma Campus Leader Social Team](https://www.figma.com/design/QLmoeEgdhjwgqjQhcbopeq/Figma-Campus-Leader--Social-Team?node-id=0-1). Target: Oscar's section (`home`, `questions`, `figpal selection`, `assets`, `ref`).

- Export FigPals from `ALL FIGPALS` to `src/assets/figpals/<slug>.svg` (`figgy`, `pufferfish`, `capybara`, …). The slug is what `players.figpal_slug` stores.
- Brand Book page → Tailwind theme tokens (colors, type, radii, spacing).
- Screens Timothy designs reuse Oscar's components and the brand tokens.

### 8.5 Responsive and accessibility

- Desktop 1440, tablet 768–1024, phone in one column.
- Timer shows a number, and tiers always have a text label (not color alone).
- `prefers-reduced-motion` skips the sinking animation and shows the reveal card directly.

## 9. Backend (Chris)

Implemented in [`supabase/migrations/20261124000000_figillion_init.sql`](supabase/migrations/20261124000000_figillion_init.sql), with the practice game in [`supabase/seed.sql`](supabase/seed.sql) and checks in [`supabase/tests/smoke.sql`](supabase/tests/smoke.sql). Chris's setup steps: [supabase-setup.md](supabase-setup.md). The frontend depends only on what's below; changes need a heads-up to Timothy.

### 9.1 Tables

```
public.games             id, slug, title, opens_at, closes_at, round_count (5),
                         prompt_seconds (25), countdown_seconds (3)          -- public read
public.tiers             key, label, points, description, sort_order          -- public read
public.import_prompts    game_slug, round, theme, prompt                      -- locked, CSV landing
public.import_answers    game_slug, round, answer, aliases, tier, fun_fact    -- locked, CSV landing

private.prompts          id, game_id, round, theme, text
private.accepted_answers id, prompt_id, answer, aliases text[], tier, fun_fact
private.players          id, user_id → auth.users, game_id, display_name (1-24), figpal_slug,
                         score, joined_at, finished_at          unique (user_id, game_id)
private.player_rounds    id, player_id, prompt_id, round, started_at, clock_starts_at, deadline,
                         resolved_at, accepted_answer_id, tier, points, final_input
                                                                 unique (player_id, round)
private.attempts         id, player_round_id, raw_answer, normalized, matched_answer_id,
                         accepted, created_at
```

### 9.2 Access rules

- Anonymous sign-ins **enabled** (they use the `authenticated` role).
- `public.games`, `public.tiers`: SELECT only, for everyone.
- `public.import_*`: RLS on, no policies, all privileges revoked.
- `private` schema: not exposed by the Data API; all table and function privileges revoked from `anon`/`authenticated`.
- The 8 RPCs below are the only entry points. All are `security definer` with `search_path = ''`. `get_leaderboard` is callable by `anon`; the rest need a (possibly anonymous) session.

### 9.3 RPCs

| Function | Returns | Rules |
|---|---|---|
| `get_my_progress(game_slug)` | game status, joined?, current round, score, depth, finished? | Works before joining. |
| `join_game(game_slug, display_name, figpal_slug)` | player | Game open; one player row per anon user. |
| `start_prompt(game_slug, round)` | round, theme, text, `deadline` | Previous round resolved. The first call reveals the prompt and starts the 25 s clock. Later calls keep the stored deadline. After the game closes, only a round still in progress can be resumed (`game_not_open` otherwise). |
| `submit_answer(game_slug, round, answer)` | `accepted`, and if accepted: tier, points, canonical answer, total score, depth | During the server’s scoring window for an unresolved round. Matching per 3.2. |
| `finish_prompt(game_slug, round)` | same shape with 0 points | At or after the deadline with no accepted answer. Sets `finished_at` after round 5, or right away once the game has closed. |
| `get_results(game_slug)` | score, depth, rank, total players, percentile, score histogram (20 buckets), per-round answer/tier/points | Only when finished. |
| `get_catch(game_slug)` | every round's accepted answers with points, figlion first with fun fact | Only when finished. |
| `get_leaderboard(game_slug, limit 25)` | ranked rows, counts (total, finished, diving), and `me` (your rank) when signed in | Public. Max 100 rows. |

SQL Editor only, not callable from the app: `private.publish_import(game_slug, p_force default false)` for the content import, and `private.finalize_game(game_slug)` to finish every remaining dive after a game closes. Error messages the app must handle are listed in [supabase-setup.md](supabase-setup.md) section 9.

## 10. Sizing for 220 players

- About 220 players × ~8 RPC calls each (join, 5 starts, ~1.5 submits per prompt, results) ≈ 2,000 calls over 10 to 20 minutes. Fine for Supabase.
- **No Realtime.** The Supabase Free plan caps concurrent Realtime connections at around 200. That would probably be fine, but polling avoids the limit and is simpler. The leaderboard polls `get_leaderboard` every 3 s: about 70 requests/s worst case if everyone has it open, each returning 25 rows.
- **Anonymous sign-in rate limit** is per IP (30/hour by default). Chris raises it to 300 in case players share a network.
- Index `submissions(player_id, prompt_id)` and `players(game_id, finished_at)`; the leaderboard is a single aggregate over at most 220 players.
- Vercel serves static files, so there's no server load there.

## 11. Testing and launch checks

- **Unit (Vitest):** dive state machine, timer from deadline, depth/score formatting, rank-title bands.
- **SQL tests:** matching (exact, alias, modifier keys, 1-edit typo accepted, transposition rejected), deadline enforcement, one scored answer per round, `get_catch` blocked before finishing, anon cannot select `prompts`/`accepted_answers` via REST.
- **Content check:** per prompt, answer count, at least one figlion, no duplicate normalized answers or aliases across answers.
- **Leak check:** in the production build, search the JS bundle and the Network tab for a known answer string; it must not appear before finishing.
- **Manual:** full dive on desktop Chrome, Safari and an iPad; refresh mid-prompt; timeout path; two browsers with the leaderboard open.
- **Dry run:** the team plays the `practice` game on the production URL before Dec 8.

## 12. Timeline

| When | Milestone |
|---|---|
| **Today, Nov 24** | Playable end to end on Vercel against the `practice` game. Chris: project, anonymous sign-ins, run the migration and seed, DM Timothy the URL + publishable key ([supabase-setup.md](supabase-setup.md) sections 1–5, about 20 min). Timothy: scaffold, Home, Dive (with reveal), Results (basic), Leaderboard (basic), with placeholder art where exports aren't ready. |
| Nov 25–30 | Figma assets and brand tokens in place; reveal animation; full Results (curve, dive log, Catch); Ankita's real content in the sheet. |
| Dec 1–3 | Team review of questions; import into Supabase; leak check; device testing. |
| Dec 5 | Team dry run on production. |
| Dec 7 | Freeze; set `opens_at`/`closes_at` for the call. |
| **Dec 8** | All Hands. |

## 13. Open items

1. **Game window:** who opens and closes the game for Dec 8, and when?
2. **Round themes** for the 5 prompts (Ankita).
3. **Srishti's role.**
4. **Remaining tier description lines** (Oscar/Ankita).
5. **Make the repo private?** Not required with the storage rules above, but it would remove one way to leak content by accident.
