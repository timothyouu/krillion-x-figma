-- Minimal Supabase stand-ins so the migration can be tested on plain Postgres.
-- NOT for a real Supabase project (it already has all of this).

create role anon nologin;
create role authenticated nologin;

create schema auth;
grant usage on schema auth to anon, authenticated;

create table auth.users (id uuid primary key);

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;

grant usage on schema public to anon, authenticated;
