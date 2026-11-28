-- Closing a game must not strand players partway through. Test state is rolled back.
-- Run on the local practice seed after applying all migrations:
--   docker exec -i supabase_db_figillion psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/close_game.sql
\set ON_ERROR_STOP on
begin;

insert into auth.users (id) values
  ('c1000000-0000-0000-0000-00000000000a'),  -- A: between rounds when the game closes
  ('c1000000-0000-0000-0000-00000000000b'),  -- B: answering when the game closes
  ('c1000000-0000-0000-0000-00000000000c'),  -- C: clock ran out and the tab is gone
  ('c1000000-0000-0000-0000-00000000000d');  -- D: joined but never started

-- The sweep is for closed games only, and players can't call it.
do $$
begin
  begin
    perform private.finalize_game('practice');
    raise exception 'expected game_not_closed';
  exception when raise_exception then
    assert sqlerrm = 'game_not_closed', sqlerrm;
  end;
end $$;

set local role authenticated;
do $$
begin
  perform private.finalize_game('practice');
  raise exception 'expected permission denied';
exception when insufficient_privilege then
  null;
end $$;
reset role;

do $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-00000000000a', true);
  perform public.join_game('practice', 'Close A', 'figgy');
  perform public.start_prompt('practice', 1);
  r := public.submit_answer('practice', 1, 'Red');
  assert (r ->> 'points')::int = 10, 'A scores round 1';

  perform set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-00000000000b', true);
  perform public.join_game('practice', 'Close B', 'figgy');
  perform public.start_prompt('practice', 1);

  perform set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-00000000000c', true);
  perform public.join_game('practice', 'Close C', 'figgy');
  perform public.start_prompt('practice', 1);

  perform set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-00000000000d', true);
  perform public.join_game('practice', 'Close D', 'figgy');
end $$;

-- C's clock ran out before the close.
update private.player_rounds pr
   set clock_starts_at = clock_timestamp() - interval '30 seconds',
       deadline = clock_timestamp() - interval '5 seconds'
  from private.players pl
 where pl.id = pr.player_id and pl.user_id = 'c1000000-0000-0000-0000-00000000000c';

-- The host ends the game.
update public.games set closes_at = now() where slug = 'practice';

do $$
declare r jsonb;
begin
  -- A: between rounds. No new round starts, and the dive finishes with what A has.
  perform set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-00000000000a', true);
  begin
    perform public.start_prompt('practice', 2);
    raise exception 'expected game_not_open';
  exception when raise_exception then
    assert sqlerrm = 'game_not_open', sqlerrm;
  end;
  r := public.get_my_progress('practice');
  assert (r -> 'player' ->> 'finished')::boolean, 'A finishes when the game closes';
  assert (r -> 'player' ->> 'rounds_resolved')::int = 5, 'A has every round resolved';
  assert (r -> 'player' ->> 'score')::int = 10, 'A keeps their score';
  assert jsonb_typeof(r -> 'active_round') = 'null', 'A has no active round';
  r := public.get_results('practice');
  assert jsonb_array_length(r -> 'rounds') = 5, 'A gets all five rounds in results';
  assert (r -> 'rounds' -> 1 ->> 'timed_out')::boolean and (r -> 'rounds' -> 1 ->> 'points')::int = 0,
    'unplayed rounds score zero';
  assert jsonb_array_length(public.get_catch('practice') -> 'rounds') = 5, 'A can open the Catch';

  -- B: still inside the answer window. The round stays playable until its deadline.
  perform set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-00000000000b', true);
  r := public.get_my_progress('practice');
  assert not (r -> 'player' ->> 'finished')::boolean, 'B is not cut off mid-answer';
  assert (r -> 'active_round' ->> 'round')::int = 1, 'B still sees the active round';
  assert r -> 'active_round' ->> 'text' <> '', 'B still sees the prompt';
  assert public.start_prompt('practice', 1) ->> 'text' <> '', 'B can reload the active round';
  r := public.submit_answer('practice', 1, 'Blue');
  assert (r ->> 'accepted')::boolean and (r ->> 'points')::int = 10, 'B can still score the open round';
  assert (r -> 'player' ->> 'finished')::boolean, 'B finishes once that round resolves';
  begin
    perform public.start_prompt('practice', 2);
    raise exception 'expected game_not_open';
  exception when raise_exception then
    assert sqlerrm = 'game_not_open', sqlerrm;
  end;
end $$;

-- After the close, the sweep finishes everyone whose tab is gone.
do $$
declare r jsonb;
begin
  r := private.finalize_game('practice');
  assert (r ->> 'finalized')::int >= 2, 'C and D are finalized: ' || r::text;
  assert (r ->> 'still_answering')::int = 0, 'nobody is mid-round: ' || r::text;
  assert (public.get_leaderboard('practice') ->> 'diving')::int = 0, 'nobody is left diving';
  assert (private.finalize_game('practice') ->> 'finalized')::int = 0, 'a second sweep changes nothing';

  perform set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-00000000000c', true);
  r := public.get_my_progress('practice');
  assert (r -> 'player' ->> 'finished')::boolean and (r -> 'player' ->> 'score')::int = 0, 'C finishes at zero';
  assert (r -> 'player' ->> 'rounds_resolved')::int = 5, 'C has every round resolved';

  perform set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-00000000000d', true);
  r := public.get_my_progress('practice');
  assert (r -> 'player' ->> 'finished')::boolean and (r -> 'player' ->> 'rounds_resolved')::int = 5,
    'D finishes with every round at zero';
end $$;

rollback;
select 'CLOSE GAME CHECKS PASSED' as result;
