-- Own the answer window on the server. The countdown runs before requesting the prompt.
-- Existing server-side countdowns retain their stored boundaries and redact the prompt until open.

create or replace function public.get_my_progress(p_game_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g      public.games;
  v_pid  uuid;
  active jsonb;
  v_now  timestamptz := clock_timestamp();
begin
  g := private.game_by_slug(p_game_slug);

  select pl.id into v_pid from private.players pl
  where pl.game_id = g.id and pl.user_id = auth.uid();

  if v_pid is not null then
    select jsonb_build_object(
             'round', pr.round,
             'theme', case when v_now >= pr.clock_starts_at then p.theme else '' end,
             'text', case when v_now >= pr.clock_starts_at then p.text else '' end,
             'clock_starts_at', pr.clock_starts_at, 'deadline', pr.deadline)
      into active
      from private.player_rounds pr
      join private.prompts p on p.id = pr.prompt_id
     where pr.player_id = v_pid and pr.resolved_at is null;
  end if;

  return jsonb_build_object(
    'server_now', v_now,
    'game', private.game_json(g),
    'player', case when v_pid is null then null else private.player_json(v_pid) end,
    'active_round', active
  );
end;
$$;

create or replace function public.start_prompt(p_game_slug text, p_round int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g  public.games;
  pl private.players;
  pr private.player_rounds;
  p  private.prompts;
  v_now timestamptz;
begin
  g  := private.game_by_slug(p_game_slug);
  pl := private.require_player(g.id);

  -- One start at a time per player.
  perform 1 from private.players where id = pl.id for update;

  select * into pr from private.player_rounds where player_id = pl.id and round = p_round;

  if not found then
    if private.game_status(g) <> 'open' then
      raise exception 'game_not_open';
    end if;
    if p_round is null or p_round < 1 or p_round > g.round_count then
      raise exception 'invalid_round';
    end if;
    if exists (select 1 from private.player_rounds
               where player_id = pl.id and resolved_at is null) then
      raise exception 'round_in_progress';
    end if;
    if (select count(*) from private.player_rounds
        where player_id = pl.id and round < p_round) <> p_round - 1 then
      raise exception 'round_out_of_order';
    end if;

    select * into p from private.prompts where game_id = g.id and round = p_round;
    if not found then
      raise exception 'prompt_missing';
    end if;

    -- The UI countdown ends before this call. Start the scoring clock as the prompt is issued.
    v_now := clock_timestamp();
    insert into private.player_rounds (player_id, prompt_id, round, started_at, clock_starts_at, deadline)
    values (pl.id, p.id, p_round, v_now, v_now, v_now + make_interval(secs => g.prompt_seconds))
    returning * into pr;
  else
    select * into p from private.prompts where id = pr.prompt_id;
  end if;

  v_now := clock_timestamp();
  return jsonb_build_object(
    'server_now', v_now,
    'round', pr.round,
    'round_count', g.round_count,
    -- Honor the original start time of a round that was already in countdown at migration time.
    'theme', case when v_now >= pr.clock_starts_at then p.theme else '' end,
    'text', case when v_now >= pr.clock_starts_at then p.text else '' end,
    'clock_starts_at', pr.clock_starts_at,
    'deadline', pr.deadline,
    'resolved', pr.resolved_at is not null
  );
end;
$$;

create or replace function public.submit_answer(p_game_slug text, p_round int, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g           public.games;
  pl          private.players;
  pr          private.player_rounds;
  v_raw       text := left(btrim(coalesce(p_answer, '')), 100);
  v_norm      text;
  v_answer_id uuid;
  v_tier      text;
  v_points    int;
  v_now       timestamptz;
begin
  g  := private.game_by_slug(p_game_slug);
  pl := private.require_player(g.id);

  select * into pr from private.player_rounds
   where player_id = pl.id and round = p_round
   for update;
  if not found then
    raise exception 'round_not_started';
  end if;
  if pr.resolved_at is not null then
    raise exception 'round_already_resolved';
  end if;
  v_now := clock_timestamp();
  if v_now < pr.clock_starts_at then
    raise exception 'round_not_open';
  end if;
  if v_now >= pr.deadline then
    raise exception 'time_up';
  end if;
  if (select count(*) from private.attempts where player_round_id = pr.id) >= 30 then
    raise exception 'too_many_attempts';
  end if;

  v_norm := private.normalize_answer(v_raw);
  if v_norm = '' then
    return jsonb_build_object('accepted', false, 'reason', 'empty', 'input', v_raw,
                              'server_now', now(), 'deadline', pr.deadline);
  end if;

  -- Exact match on answer or alias; otherwise 1 edit for inputs of 5+ characters.
  -- Closest wins; ties go to the rarer tier.
  select a.id, a.tier, t.points
    into v_answer_id, v_tier, v_points
    from private.accepted_answers a
    join public.tiers t on t.key = a.tier
    cross join lateral (
      select min(case
                   when private.normalize_answer(x) = v_norm then 0
                   when char_length(private.normalize_answer(x)) > 200 then 99
                   else extensions.levenshtein(private.normalize_answer(x), v_norm)
                 end) as dist
      from unnest(array_prepend(a.answer, a.aliases)) as x
    ) k
   where a.prompt_id = pr.prompt_id
     and (k.dist = 0 or (char_length(v_norm) >= 5 and k.dist <= 1))
   order by k.dist, t.sort_order desc
   limit 1;

  insert into private.attempts (player_round_id, raw_answer, normalized, matched_answer_id, accepted)
  values (pr.id, v_raw, v_norm, v_answer_id, v_answer_id is not null);

  if v_answer_id is null then
    return jsonb_build_object('accepted', false, 'reason', 'no_echo', 'input', v_raw,
                              'server_now', now(), 'deadline', pr.deadline);
  end if;

  update private.player_rounds
     set resolved_at = v_now, accepted_answer_id = v_answer_id,
         tier = v_tier, points = v_points, final_input = v_raw
   where id = pr.id;

  update private.players set score = score + v_points where id = pl.id;
  perform private.finish_if_done(pl.id);

  return private.round_json(pr.id) || jsonb_build_object('player', private.player_json(pl.id));
end;
$$;

create or replace function public.finish_prompt(p_game_slug text, p_round int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g  public.games;
  pl private.players;
  pr private.player_rounds;
  v_now timestamptz;
begin
  g  := private.game_by_slug(p_game_slug);
  pl := private.require_player(g.id);

  select * into pr from private.player_rounds
   where player_id = pl.id and round = p_round
   for update;
  if not found then
    raise exception 'round_not_started';
  end if;

  if pr.resolved_at is null then
    v_now := clock_timestamp();
    if v_now < pr.deadline then
      raise exception 'time_not_up';
    end if;
    update private.player_rounds set resolved_at = v_now, points = 0 where id = pr.id;
    perform private.finish_if_done(pl.id);
  end if;

  return private.round_json(pr.id) || jsonb_build_object('player', private.player_json(pl.id));
end;
$$;
