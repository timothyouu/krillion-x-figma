-- Verify the server clock on the practice seed. Test state is rolled back.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id) values ('731cb31d-87c5-424d-91ef-fce54cfbdc52');
select set_config('request.jwt.claim.sub', '731cb31d-87c5-424d-91ef-fce54cfbdc52', true);

do $$
declare
  started jsonb;
  response jsonb;
  round_id uuid;
begin
  perform public.join_game('practice', 'Answer Window Check', 'figgy');
  started := public.start_prompt('practice', 1);
  assert started ->> 'text' <> '', 'opening the round must reveal the prompt';
  assert (started ->> 'clock_starts_at')::timestamptz <= (started ->> 'server_now')::timestamptz,
    'prompt must be returned inside its scoring window';
  assert (started ->> 'deadline')::timestamptz - (started ->> 'clock_starts_at')::timestamptz
      = interval '25 seconds', 'practice must have exactly 25 scoring seconds';
  assert public.start_prompt('practice', 1) ->> 'deadline' = started ->> 'deadline',
    'repeat calls must retain the deadline';
  assert public.get_my_progress('practice') -> 'active_round' ->> 'deadline' = started ->> 'deadline',
    'resuming must retain the deadline';

  select pr.id into strict round_id
    from private.player_rounds pr join private.players pl on pl.id = pr.player_id
   where pl.user_id = auth.uid() and pr.round = 1;

  -- Recreate an active countdown that existed before installing the migration.
  update private.player_rounds
     set clock_starts_at = clock_timestamp() + interval '1 minute',
         deadline = clock_timestamp() + interval '85 seconds'
   where id = round_id;
  response := public.get_my_progress('practice') -> 'active_round';
  assert response ->> 'text' = '' and response ->> 'theme' = '', 'resume must redact a pending prompt';
  response := public.start_prompt('practice', 1);
  assert response ->> 'text' = '' and response ->> 'theme' = '', 'restart must redact a pending prompt';
  begin
    perform public.submit_answer('practice', 1, 'Red');
    raise exception 'expected round_not_open';
  exception when raise_exception then
    assert sqlerrm = 'round_not_open', sqlerrm;
  end;

  update private.player_rounds
     set clock_starts_at = clock_timestamp() - interval '25 seconds',
         deadline = clock_timestamp() + interval '900 milliseconds'
   where id = round_id;
  begin
    perform public.finish_prompt('practice', 1);
    raise exception 'expected time_not_up';
  exception when raise_exception then
    assert sqlerrm = 'time_not_up', sqlerrm;
  end;

  update private.player_rounds set deadline = clock_timestamp() - interval '250 milliseconds' where id = round_id;
  begin
    perform public.submit_answer('practice', 1, 'Red');
    raise exception 'expected time_up';
  exception when raise_exception then
    assert sqlerrm = 'time_up', sqlerrm;
  end;
  response := public.finish_prompt('practice', 1);
  assert (response ->> 'timed_out')::boolean and (response ->> 'points')::int = 0, 'timeout must resolve at zero';
  assert not exists(select 1 from private.attempts where player_round_id = round_id), 'rejected timing must never record attempts';

  perform public.start_prompt('practice', 2);
  response := public.submit_answer('practice', 2, 'Dragon fruit');
  assert (response ->> 'accepted')::boolean and (response ->> 'points')::int = 15, 'valid in-window answers must score normally';
end
$$;

rollback;
select 'ANSWER WINDOW CHECKS PASSED' as result;
