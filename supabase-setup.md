# Figillion: Supabase setup (for Chris)

This is everything needed to get the backend ready for a playable game **today (Nov 24)**, then for Ankita's real content and Dec 8. The full design is in [specs.md](specs.md) (sections 4, 5 and 9).

The database is already written: [`supabase/migrations/20261124000000_figillion_init.sql`](supabase/migrations/20261124000000_figillion_init.sql). Your job is to create the project, run it, switch on anonymous sign-ins, and send Timothy two values. Read through the migration before running it; anything you'd change, tell Timothy so the spec stays in sync.

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
2. Paste the whole migration file and **Run**. It should finish with "Success. No rows returned".
3. New query: paste [`supabase/seed.sql`](supabase/seed.sql) and **Run**. It creates the `practice` game with 5 generic prompts and returns a summary like `{"game": "practice", "rounds": [...]}`.

**Option B: Supabase CLI**
```bash
supabase link --project-ref <project-ref>
supabase db push                 # applies supabase/migrations
psql "<connection string>" -f supabase/seed.sql
```

What it creates:

| Schema | Objects | Exposed to the app? |
|---|---|---|
| `public` | `games`, `tiers` | Read-only |
| `public` | `import_prompts`, `import_answers` | No (locked CSV landing tables) |
| `private` | `prompts`, `accepted_answers`, `players`, `player_rounds`, `attempts` | No. The schema isn't exposed by the API at all |
| `public` | 8 RPCs: `get_my_progress`, `join_game`, `start_prompt`, `submit_answer`, `finish_prompt`, `get_results`, `get_catch`, `get_leaderboard` | Yes, the only way in |
| `private` | `publish_import()` and helpers | No. You run `publish_import` from the SQL Editor |

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
- `tier`: `common`, `too_clever`, `uncommon`, `rare`, `deep_cut`, `figlion` (labels like "Deep Cut" also work).
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

- Set the window (section 6) a day ahead, and test with `practice` on the production site.
- Watch: **Database → Query Performance** and **Logs → Postgres** for errors. Useful live counts:
  ```sql
  select count(*) filter (where finished_at is null) as diving,
         count(*) filter (where finished_at is not null) as finished
  from private.players p join public.games g on g.id = p.game_id
  where g.slug = 'midyear-2026';
  ```
- To end the game: `update public.games set closes_at = now() where slug = 'midyear-2026';`

## 9. Error messages the app handles

The RPCs raise these exact messages; Timothy's UI maps them to screens or toasts.

| Message | Meaning |
|---|---|
| `game_not_found` | Wrong slug |
| `game_not_open` | Before `opens_at` or after `closes_at` |
| `not_signed_in` | No anonymous session yet |
| `not_joined` | Player hasn't called `join_game` |
| `invalid_display_name` / `invalid_figpal` | Name not 1–24 chars / bad FigPal slug |
| `invalid_round` / `round_out_of_order` / `round_in_progress` | Client asked for the wrong round |
| `round_not_started` / `round_already_resolved` | Submitting to a round that isn't active |
| `time_up` | Submitted more than 2 s after the deadline; the client should call `finish_prompt` |
| `time_not_up` | `finish_prompt` called too early |
| `too_many_attempts` | 30 tries on one prompt |
| `not_finished` | Results or Catch requested before the dive is done |

## 10. Testing the migration locally (optional)

[`supabase/tests/smoke.sql`](supabase/tests/smoke.sql) runs about 50 checks: access rules, matching, timers, scoring, results, and import validation. With the Supabase CLI (`supabase start`, then `supabase db reset`), run it against the local database:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/smoke.sql
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
