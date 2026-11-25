-- Smoke test for the Figillion migration + practice seed.
-- Run as a superuser on a database where the migration and seed.sql have been applied:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/smoke.sql
-- Every check raises an error on failure, so a clean run means all checks passed.

\set ON_ERROR_STOP on

-- Helper: run SQL and require it to fail with a given message.
create schema if not exists tests;
grant usage on schema tests to anon, authenticated;
create or replace function tests.expect_error(p_sql text, p_msg text) returns void
language plpgsql as $$
begin
  execute p_sql;
  raise exception 'expected error "%" but it succeeded: %', p_msg, p_sql using errcode = 'XX000';
exception
  when sqlstate 'XX000' then raise;
  when others then
    if position(p_msg in sqlerrm) = 0 then
      raise exception 'expected error "%" but got "%" from: %', p_msg, sqlerrm, p_sql;
    end if;
end $$;
grant execute on function tests.expect_error(text, text) to anon, authenticated;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

-- ── Normalization ──
do $$ begin
  assert private.normalize_answer('⌘ + Shift + A') = 'cmd shift a', 'cmd symbol';
  assert private.normalize_answer('Command+Shift+A') = 'cmd shift a', 'command word';
  assert private.normalize_answer('  Option-Drag ') = 'opt drag', 'option';
  assert private.normalize_answer('Alt drag') = 'opt drag', 'alt';
  assert private.normalize_answer('Control + C') = 'ctrl c', 'control';
  assert private.normalize_answer('Auto Layout!!') = 'auto layout', 'punctuation';
  assert private.tier_key('Deep Cut') = 'deep_cut', 'tier label';
  assert private.tier_key('  OVERPLAYED  ') = 'overplayed', 'normalize Overplayed label';
end $$;

-- ── Seed loaded ──
do $$ begin
  assert (select count(*) from private.prompts p join public.games g on g.id = p.game_id where g.slug = 'practice') = 5, 'five prompts';
  assert (select count(*) from private.accepted_answers) > 40, 'answers loaded';
  assert (select count(*) from public.import_answers) = 0, 'landing table cleared';
end $$;

-- ── Anonymous visitor (not signed in) ──
set role anon;
select tests.expect_error('select * from private.accepted_answers', 'permission denied');
select tests.expect_error('select * from private.prompts', 'permission denied');
select tests.expect_error('select * from public.import_answers', 'permission denied');
select tests.expect_error($$select public.submit_answer('practice', 1, 'red')$$, 'permission denied');
select tests.expect_error($$select private.publish_import('practice', true)$$, 'permission denied');
do $$ begin
  assert (select count(*) from public.tiers) = 6, 'anon can read tiers';
  assert (public.get_leaderboard('practice') ->> 'total_players')::int = 0, 'anon can read leaderboard';
end $$;
reset role;

-- ── Player 1 ──
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;

select tests.expect_error('select * from private.accepted_answers', 'permission denied');
select tests.expect_error('insert into public.games (slug, title, opens_at, closes_at) values (''x'',''x'',now(),now()+interval ''1 day'')', 'permission denied');
select tests.expect_error($$select public.start_prompt('practice', 1)$$, 'not_joined');
select tests.expect_error($$select public.join_game('practice', '   ', 'figgy')$$, 'invalid_display_name');
select tests.expect_error($$select public.join_game('practice', 'Tim', 'Figgy!')$$, 'invalid_figpal');
select tests.expect_error($$select public.join_game('nope', 'Tim', 'figgy')$$, 'game_not_found');

do $$
declare r jsonb; s jsonb;
begin
  r := public.join_game('practice', '  Tim   Ou ', 'figgy');
  assert r ->> 'display_name' = 'Tim Ou', 'name trimmed';

  -- Round 1: prompt only arrives on start; idempotent restart keeps the deadline.
  s := public.start_prompt('practice', 1);
  assert s ->> 'text' = 'Name a color', 'round 1 text';
  assert (public.start_prompt('practice', 1) ->> 'deadline') = s ->> 'deadline', 'start is idempotent';

  r := public.submit_answer('practice', 1, 'ramne');
  assert (r ->> 'accepted')::boolean = false and r ->> 'reason' = 'no_echo', 'no echo';
  r := public.submit_answer('practice', 1, '   ');
  assert r ->> 'reason' = 'empty', 'empty input';
  r := public.submit_answer('practice', 1, 'periwinkel');      -- transposition = 2 edits
  assert (r ->> 'accepted')::boolean = false, 'transposition rejected';
  r := public.submit_answer('practice', 1, 'perwinkle');       -- 1 deletion
  assert (r ->> 'accepted')::boolean and r ->> 'tier' = 'deep_cut' and (r ->> 'points')::int = 85, 'one-edit typo accepted';
  assert r ->> 'answer' = 'Periwinkle', 'canonical answer returned';
  assert (r -> 'player' ->> 'score')::int = 85 and (r -> 'player' ->> 'depth_m')::int = 850, 'score and depth';
end $$;

select tests.expect_error($$select public.submit_answer('practice', 1, 'red')$$, 'round_already_resolved');
select tests.expect_error($$select public.start_prompt('practice', 3)$$, 'round_out_of_order');
select tests.expect_error($$select public.start_prompt('practice', 9)$$, 'invalid_round');
select tests.expect_error($$select public.get_catch('practice')$$, 'not_finished');
select tests.expect_error($$select public.get_results('practice')$$, 'not_finished');

do $$
declare r jsonb; p jsonb;
begin
  -- Round 2: alias match, short inputs are exact-only.
  perform public.start_prompt('practice', 2);
  r := public.submit_answer('practice', 2, 'kiw');            -- 3 chars, no fuzzy
  assert (r ->> 'accepted')::boolean = false, 'short input is exact only';
  r := public.submit_answer('practice', 2, 'Dragonfruit');
  assert r ->> 'tier' = 'overplayed' and (r ->> 'points')::int = 15, 'alias accepted';

  -- Round 3 started, then a refresh: progress shows the active round.
  perform public.start_prompt('practice', 3);
  p := public.get_my_progress('practice');
  assert (p -> 'active_round' ->> 'round')::int = 3, 'resume shows active round';
  assert (p -> 'player' ->> 'rounds_resolved')::int = 2, 'two rounds resolved';
end $$;

select tests.expect_error($$select public.start_prompt('practice', 4)$$, 'round_in_progress');
select tests.expect_error($$select public.finish_prompt('practice', 3)$$, 'time_not_up');
reset role;

-- Simulate the round-3 clock running out.
update private.player_rounds set deadline = now() - interval '30 seconds' where round = 3;

set role authenticated;
select tests.expect_error($$select public.submit_answer('practice', 3, 'Neptune')$$, 'time_up');
do $$
declare r jsonb;
begin
  r := public.finish_prompt('practice', 3);
  assert (r ->> 'timed_out')::boolean and (r ->> 'points')::int = 0, 'timeout scores zero';
  r := public.finish_prompt('practice', 3);
  assert (r ->> 'timed_out')::boolean, 'finish is idempotent';

  perform public.start_prompt('practice', 4);
  r := public.submit_answer('practice', 4, 'go');             -- 2-char exact
  assert r ->> 'tier' = 'uncommon', 'short exact match';

  perform public.start_prompt('practice', 5);
  r := public.submit_answer('practice', 5, 'friendster');
  assert r ->> 'tier' = 'figlion' and (r -> 'player' ->> 'finished')::boolean, 'last round finishes the dive';
  assert (r -> 'player' ->> 'score')::int = 85 + 15 + 0 + 30 + 100, 'total score';

  r := public.get_results('practice');
  assert (r ->> 'rank')::int = 1, 'rank 1';
  assert jsonb_array_length(r -> 'histogram') = 20, 'histogram buckets';
  assert jsonb_array_length(r -> 'rounds') = 5, 'five rounds in results';

  r := public.get_catch('practice');
  assert r -> 'rounds' -> 0 -> 'answers' -> 0 ->> 'tier' = 'figlion', 'catch lists figlion first';
  assert r -> 'rounds' -> 0 -> 'answers' -> 0 ->> 'fun_fact' is not null, 'fun fact present';
end $$;
select tests.expect_error($$select public.start_prompt('practice', 6)$$, 'invalid_round');
reset role;

-- ── Player 2: mid-dive, then leaderboard ordering ──
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$
declare r jsonb;
begin
  perform public.join_game('practice', 'Chris', 'capybara');
  perform public.start_prompt('practice', 1);
  perform public.submit_answer('practice', 1, 'red');
  r := public.get_leaderboard('practice');
  assert (r ->> 'total_players')::int = 2 and (r ->> 'finished')::int = 1 and (r ->> 'diving')::int = 1, 'counts';
  assert r -> 'rows' -> 0 ->> 'display_name' = 'Tim Ou', 'leader first';
  assert (r -> 'me' ->> 'rank')::int = 2, 'my rank';
end $$;
select tests.expect_error($$select public.get_catch('practice')$$, 'not_finished');
reset role;

-- ── Import validation ──
insert into public.import_prompts (game_slug, round, theme, prompt) values ('practice', 1, 't', 'p');
insert into public.import_answers (game_slug, round, answer, aliases, tier) values
  ('practice', 1, 'Alpha', 'same', 'common'),
  ('practice', 1, 'Beta',  'same', 'mythic');
do $$
begin
  perform private.publish_import('practice');
  raise exception 'import should have failed' using errcode = 'XX000';
exception
  when sqlstate 'XX000' then raise;
  when others then
    assert position('round 2: no prompt' in sqlerrm) > 0, 'missing rounds reported';
    assert position('unknown tier "mythic"' in sqlerrm) > 0, 'bad tier reported';
    assert position('matches more than one answer' in sqlerrm) > 0, 'duplicate alias reported';
    assert position('needs at least one figlion' in sqlerrm) > 0, 'figlion rule reported';
    assert position('players have already started' in sqlerrm) > 0, 'played-game guard reported';
end $$;
delete from public.import_answers;
delete from public.import_prompts;

drop schema tests cascade;
select 'ALL SMOKE CHECKS PASSED' as result;
