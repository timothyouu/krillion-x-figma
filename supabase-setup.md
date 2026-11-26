# Figillion: Supabase setup (for Chris)

This is everything needed to get the backend ready for a playable game **today (Nov 24)**, then for Ankita's real content and Dec 8. The full design is in [specs.md](specs.md) (sections 4, 5 and 9).

Start with [`supabase/migrations/20261124000000_figillion_init.sql`](supabase/migrations/20261124000000_figillion_init.sql) and apply the follow-up migrations in section 3. Then switch on anonymous sign-ins and send Timothy the two values in section 5. Review the SQL before running it. Tell Timothy about any changes so the spec stays in sync.

---

## 1. Create the project (5 min)

1. In the Supabase dashboard, create a new project in the team's org.
   - Name: `figillion`
   - Region: closest to most Campus Leaders (US West or US East).
   - Database password: generate one and keep it in your password manager. **Don't share it.**
2. Plan: Free works for testing. For Dec 8 (about 220 players), check the plan's limits on the project's Usage page. We don't use Realtime (the leaderboard polls), so the free tier's ~200 Realtime connection cap doesn't apply.

## 2. Switch on anonymous sign-ins (2 min)

Players join with just a name, so every device signs in anonymously.

1. **Authentication → Sign In / Providers → Allow anonymous sign-ins: on.** Save.
2. **Authentication → Rate Limits:** anonymous sign-ins are limited per IP per hour (30 by default). Raise it to **300** before Dec 8 in case people share a network.
3. Leave email confirmations and other providers alone; we don't use them.

## 3. Run the migration (5 min)

Pick one:

**Option A: SQL Editor (no tools needed)**
1. Open **SQL Editor → New query**.
2. On a fresh project, run the [initial migration](supabase/migrations/20261124000000_figillion_init.sql), then the [answer-window migration](supabase/migrations/20261125025004_enforce_prompt_answer_window.sql), then the [game-close migration](supabase/migrations/20261126041750_finish_dives_when_game_closes.sql). On an existing project, apply the pending migrations only, in that order.
3. For a fresh practice database, paste [`supabase/seed.sql`](supabase/seed.sql) and **Run**. It creates the `practice` game with 5 generic prompts and returns a summary like `{"game": "practice", "rounds": [...]}`.

**Option B: Supabase CLI**
```bash
supabase link --project-ref <project-ref>
supabase db push                 # applies supabase/migrations
psql "<connection string>" -f supabase/seed.sql  # fresh practice database only
```

What it creates:

| Schema | Objects | Exposed to the app? |
|---|---|---|
| `public` | `games`, `tiers` | Read-only |
| `public` | `import_prompts`, `import_answers` | No (locked CSV landing tables) |
| `private` | `prompts`, `accepted_answers`, `players`, `player_rounds`, `attempts` | No. The schema isn't exposed by the API at all |
| `public` | 8 RPCs: `get_my_progress`, `join_game`, `start_prompt`, `submit_answer`, `finish_prompt`, `get_results`, `get_catch`, `get_leaderboard` | Yes, the only way in |
| `private` | `publish_import()`, `finalize_game()` and helpers | No. You run them from the SQL Editor |

### Answer-window fix for an existing project

Apply [migration 20261125025004](supabase/migrations/20261125025004_enforce_prompt_answer_window.sql) before deploying the matching frontend. If you already ran the initial migration, this SQL file is the only Supabase change needed for the timer fix. It replaces four RPC definitions and preserves existing prompts, answers, scores, and round deadlines.

On the updated frontend, the countdown runs before the browser requests the prompt. The server starts the game’s configured answer window when it sends the prompt. For the standard 25-second round, it accepts answers from `clock_starts_at` up to but excluding `deadline`. Timeout can resolve at that same deadline. Refreshing after the prompt appears keeps the existing deadline.

After deploying both parts, play a fresh `practice` dive. Confirm that the countdown shows no question, the question appears when the timer starts at 25, and a refresh during that prompt shows the remaining time. Let one round expire and confirm it scores zero.

## 4. Check it's locked down (5 min)

In the SQL Editor:

```sql
-- Practice content loaded
select g.slug, p.round, p.text, count(a.*) as answers
from private.prompts p
join public.games g on g.id = p.game_id
left join private.accepted_answers a on a.prompt_id = p.id
group by 1, 2, 3 order by 2;

-- Leaderboard works
select public.get_leaderboard('practice');
```

Then from a terminal, as the public would (replace the two values from step 5):

```bash
# Should FAIL: the answer key isn't reachable through the API
curl "$SUPABASE_URL/rest/v1/accepted_answers?select=*" -H "apikey: $ANON_KEY"
curl "$SUPABASE_URL/rest/v1/import_answers?select=*"  -H "apikey: $ANON_KEY"

# Should WORK: public tables and the leaderboard
curl "$SUPABASE_URL/rest/v1/tiers?select=*" -H "apikey: $ANON_KEY"
curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_leaderboard" -H "apikey: $ANON_KEY" \
     -H "Content-Type: application/json" -d '{"p_game_slug":"practice"}'
```

Also check **Advisors → Security** in the dashboard and send Timothy anything it flags.

## 5. Send Timothy these two values

From **Project Settings → API Keys** (and the project URL on the project's home or **Data API** page):

| Value | Looks like | Where it goes |
|---|---|---|
| Project URL | `https://<ref>.supabase.co` | `VITE_SUPABASE_URL` in `.env.local` and Vercel |
| Publishable key (or legacy **anon** key) | `sb_publishable_…` or a long `eyJ…` JWT | `VITE_SUPABASE_ANON_KEY` in `.env.local` and Vercel |

Send them in a **DM to Timothy**, not a shared channel. They end up in the public JS bundle anyway, but there's no reason to post them around.

**Never send or paste anywhere:** the **secret / service_role key**, the **database password**, or the **connection string with the password in it**. These bypass every access rule. They don't go in Vercel, `.env.local`, GitHub, or Slack.

Optional: invite Timothy to the project with a **Developer** role so he can read logs and run test queries. That way he doesn't need any keys beyond the two above.

## 6. Create the real game (when Ankita's content is ready)

```sql
insert into public.games (slug, title, opens_at, closes_at)
values ('midyear-2026', 'Figillion · Midyear All Hands',
        '2026-12-08 00:00:00-08', '2026-12-09 00:00:00-08');   -- OPEN: real window TBD
```

Change the window any time (e.g. to open it early for a test, or extend it on the day):

```sql
update public.games set opens_at = now(), closes_at = now() + interval '2 hours'
where slug = 'midyear-2026';
```

## 7. Import Ankita's questions

Ankita keeps the real content in a **private Google Sheet** with two tabs. The header row must match these column names exactly:

**Tab `prompts`**

| game_slug | round | theme | prompt |
|---|---|---|---|
| midyear-2026 | 1 | Shortcuts | Name a Figma keyboard shortcut you use every day |

**Tab `answers`**

| game_slug | round | answer | aliases | tier | fun_fact |
|---|---|---|---|---|---|
| midyear-2026 | 1 | Auto layout (Shift A) | shift a\|auto layout | uncommon | |
| midyear-2026 | 1 | Pixel preview (Ctrl P) | pixel preview | figlion | Shows exactly how a design renders at 1x. |

- `aliases`: other spellings separated by `|`. The fuzzy match only forgives one typo, so add real variants (Mac/Windows forms, abbreviations).
- `tier`: `common`, `overplayed`, `uncommon`, `rare`, `deep_cut`, `figlion` (labels like "Deep Cut" also work).
- `fun_fact`: only needed for figlion answers; it shows at the top of the Catch.

Steps:
1. In the Sheet: **File → Download → CSV** for each tab. Save to your Downloads folder, **not the repo** (the repo is public).
2. In the dashboard **Table Editor**, open `public.import_prompts` → **Insert → Import data from CSV** → pick `prompts.csv`. Do the same for `public.import_answers` with `answers.csv`.
3. In the SQL Editor:
   ```sql
   select private.publish_import('midyear-2026');
   ```
   - On success it moves the rows into the private tables, clears the import tables, and returns a summary with answer counts per round and tier.
   - On failure it changes nothing and lists every problem: missing rounds, unknown tiers, a round with no figlion, or one alias that matches two answers. Fix the sheet, clear the import tables (`delete from public.import_answers; delete from public.import_prompts;`), and import again.
4. Delete the CSV files from your Downloads folder.

Re-importing after people have played needs `select private.publish_import('midyear-2026', p_force => true);`, which **resets everyone's progress for that game**. Don't do that on Dec 8.

## 8. Game day (Dec 8)

### Before the window opens: clear test content

Testing leaves rows behind. Run this once after the last dry run and before the real window opens. Each statement touches only what it names, and the prompts and answers for `midyear-2026` stay.

```sql
-- 1. The temporary Figma sample game, if it was ever loaded here. Cascades its prompts, answers and players.
delete from public.games where slug = 'figma-sample-local';

-- 2. Dry-run players in the real game, so the Dec 8 leaderboard starts empty. Cascades their rounds and attempts.
delete from private.players p
using public.games g
where g.id = p.game_id and g.slug = 'midyear-2026';

-- 3. Leftover CSV landing rows from any import.
delete from public.import_answers;
delete from public.import_prompts;

-- 4. Check: expect midyear-2026 with 5 prompts and 0 players, plus practice.
select g.slug,
       (select count(*) from private.prompts p where p.game_id = g.id) as prompts,
       (select count(*) from private.players pl where pl.game_id = g.id) as players
from public.games g
order by g.slug;
```

Keep `practice`: it's the smoke test on the production site and has its own leaderboard. If you'd rather nobody wanders into it on the day, close it with `update public.games set closes_at = now() where slug = 'practice';`.

Nothing in GitHub needs cleaning. The repo only ever holds the generic practice seed; local test content lives in the git-ignored `supabase/seed/` folder and in local databases.

### On the day

- Set the window (section 6) a day ahead, and test with `practice` on the production site.
- Watch: **Database → Query Performance** and **Logs → Postgres** for errors. Useful live counts:
  ```sql
  select count(*) filter (where finished_at is null) as diving,
         count(*) filter (where finished_at is not null) as finished
  from private.players p join public.games g on g.id = p.game_id
  where g.slug = 'midyear-2026';
  ```
- To end the game:
  ```sql
  update public.games set closes_at = now() where slug = 'midyear-2026';
  ```
  No new round starts after this. A player who is mid-round can still answer until that round's 25-second deadline. After that their dive finishes: rounds they didn't reach score 0, and they go to results and the Catch. Players still on the page are finished as soon as their app next checks in.
- About 30 seconds after closing, finish everyone whose tab is gone so the leaderboard shows 0 diving:
  ```sql
  select private.finalize_game('midyear-2026');
  ```
  It returns `finalized` (players it just finished) and `still_answering` (rounds still inside their window). If `still_answering` isn't 0, wait a few seconds and run it again. It's safe to run more than once, and it refuses to run on a game that hasn't closed (`game_not_closed`).
- Reopening a game after `finalize_game` doesn't bring finalized players back. Their dives stay finished.

## 9. Error messages the app handles

The RPCs raise these exact messages; Timothy's UI maps them to screens or toasts.

| Message | Meaning |
|---|---|
| `game_not_found` | Wrong slug |
| `game_not_open` | Before `opens_at` or after `closes_at`. After the close, `start_prompt` only resumes a round still in progress. The client should resync progress, which then reports the dive finished. |
| `not_signed_in` | No anonymous session yet |
| `not_joined` | Player hasn't called `join_game` |
| `invalid_display_name` / `invalid_figpal` | Name not 1–24 chars / bad FigPal slug |
| `invalid_round` / `round_out_of_order` / `round_in_progress` | Client asked for the wrong round |
| `round_not_started` / `round_already_resolved` | Submitting to a round that isn't active |
| `round_not_open` | Submitted before the stored answer window opened. The client resyncs progress. |
| `time_up` | Submitted at or after the deadline. The client can call `finish_prompt`. |
| `time_not_up` | `finish_prompt` was called before the answer deadline. |
| `too_many_attempts` | 30 tries on one prompt |
| `not_finished` | Results or Catch requested before the dive is done |

## 10. Testing the migration locally (optional)

[`supabase/tests/smoke.sql`](supabase/tests/smoke.sql) runs about 50 checks: access rules, matching, timers, scoring, results, and import validation. With the Supabase CLI (`supabase start`, then `supabase db reset`), run it against the local database:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/smoke.sql
```

For the timer fix specifically, run [the answer-window regression test](supabase/tests/answer_window.sql) on the local practice seed after applying both migrations. It rolls back its test data and prints `ANSWER WINDOW CHECKS PASSED`. It checks prompt redaction during a preserved countdown, a fixed 25-second window, deadline reuse, rejection outside the window, and normal scoring inside it.

```bash
docker exec -i supabase_db_figillion psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/answer_window.sql
```

For the game-close fix, run [the close-game test](supabase/tests/close_game.sql) the same way. It rolls back its test data and prints `CLOSE GAME CHECKS PASSED`. It checks a player between rounds, one mid-round, one whose tab is gone and one who never started, plus `finalize_game`.

```bash
docker exec -i supabase_db_figillion psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/close_game.sql
```

On plain Postgres, run [`supabase/tests/local_stubs.sql`](supabase/tests/local_stubs.sql) first. It creates stand-ins for Supabase's `auth` schema and roles. A clean run ends with `ALL SMOKE CHECKS PASSED`.

## Checklist

- [ ] Project created; DB password in your password manager
- [ ] Anonymous sign-ins on; anonymous rate limit raised
- [ ] Migration and `seed.sql` run
- [ ] Lock-down checks in section 4 pass
- [ ] Project URL + publishable/anon key DM'd to Timothy (nothing else)
- [ ] (Optional) Timothy invited as Developer
- [ ] `midyear-2026` game row created once the window is decided
- [ ] Ankita's content imported with `publish_import` (by Dec 3)
- [ ] Test content cleared (section 8) after the last dry run
