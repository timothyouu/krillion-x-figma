// End-to-end check for the Figillion backend contract and the built frontend.
// Plays one full practice dive through the same RPCs the app uses, then checks
// that the answer key and prompts are unreachable and absent from the build.
//
// Usage (from the repo root, with local Supabase running and `npm run build` done):
//   node scripts/e2e-api.mjs
// Env overrides: SUPABASE_URL, SUPABASE_ANON_KEY, GAME_SLUG, SKIP_TIMEOUT=1, SKIP_BUNDLE=1
//
// LOCKED VERIFIER: agents in the build loop must not edit this file (see docs/LOOP.md).

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const GAME = process.env.GAME_SLUG ?? 'practice';

// Practice answers (public seed data in supabase/seed.sql).
const ROUNDS = [
  { wrong: 'ramne', typo: 'perwinkle', tier: 'deep_cut', points: 85 },
  { wrong: 'kiw', typo: 'Dragonfruit', tier: 'too_clever', points: 15 },
  { timeout: true },
  { wrong: null, typo: 'go', tier: 'uncommon', points: 30 },
  { wrong: null, typo: 'Friendster', tier: 'figlion', points: 100 },
];
const PROMPT_TEXTS = [
  'Name a color',
  'Name a fruit',
  'Name a planet in our solar system',
  'Name a programming language',
  'Name a social media app',
];

let passed = 0;
function check(cond, label, detail) {
  if (!cond) {
    console.error(`FAIL  ${label}${detail ? `\n      ${JSON.stringify(detail)}` : ''}`);
    process.exit(1);
  }
  passed += 1;
  console.log(`ok    ${label}`);
}

async function rpc(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}

async function expectRpcError(client, fn, args, msg) {
  const { error } = await client.rpc(fn, args);
  check(error && error.message.includes(msg), `${fn} rejects with ${msg}`, error ?? 'no error');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const anon = createClient(URL, KEY, { auth: { persistSession: false } });

  // Lockdown via the REST API.
  for (const table of ['accepted_answers', 'prompts', 'import_answers', 'players']) {
    const { data, error } = await anon.from(table).select('*').limit(1);
    check(error || (Array.isArray(data) && data.length === 0), `REST cannot read ${table}`, data);
  }
  const lb0 = await rpc(anon, 'get_leaderboard', { p_game_slug: GAME });
  check(typeof lb0.total_players === 'number', 'anon can read leaderboard');
  await expectRpcError(anon, 'start_prompt', { p_game_slug: GAME, p_round: 1 }, 'permission denied');

  // Player session.
  const player = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data: auth, error: authErr } = await player.auth.signInAnonymously();
  check(!authErr && auth.session, 'anonymous sign-in', authErr);

  const progress0 = await rpc(player, 'get_my_progress', { p_game_slug: GAME });
  check(progress0.game.status === 'open' && progress0.player === null, 'progress before joining');

  const name = `e2e-${Date.now().toString(36)}`.slice(0, 24);
  const joined = await rpc(player, 'join_game', { p_game_slug: GAME, p_display_name: name, p_figpal_slug: 'figgy' });
  check(joined.display_name === name, 'join_game');

  let expectedScore = 0;
  for (let i = 0; i < ROUNDS.length; i += 1) {
    const round = i + 1;
    const spec = ROUNDS[i];
    const started = await rpc(player, 'start_prompt', { p_game_slug: GAME, p_round: round });
    check(started.text === PROMPT_TEXTS[i], `round ${round} prompt arrives on start`, started);
    check(Date.parse(started.deadline) > Date.parse(started.clock_starts_at), `round ${round} has a deadline`);

    if (spec.timeout) {
      if (process.env.SKIP_TIMEOUT) {
        console.log('skip  timeout path (SKIP_TIMEOUT=1); answering instead');
        const r = await rpc(player, 'submit_answer', { p_game_slug: GAME, p_round: round, p_answer: 'Neptune' });
        expectedScore += r.points;
        continue;
      }
      await expectRpcError(player, 'finish_prompt', { p_game_slug: GAME, p_round: round }, 'time_not_up');
      const waitMs = Date.parse(started.deadline) - Date.parse(started.server_now) + 500;
      console.log(`wait  ${Math.ceil(waitMs / 1000)} s for round ${round} to time out`);
      await sleep(waitMs);
      const r = await rpc(player, 'finish_prompt', { p_game_slug: GAME, p_round: round });
      check(r.timed_out === true && r.points === 0, `round ${round} times out with 0 points`, r);
      continue;
    }

    if (spec.wrong) {
      const miss = await rpc(player, 'submit_answer', { p_game_slug: GAME, p_round: round, p_answer: spec.wrong });
      check(miss.accepted === false && miss.reason === 'no_echo', `round ${round} wrong answer is no echo`, miss);
    }
    const hit = await rpc(player, 'submit_answer', { p_game_slug: GAME, p_round: round, p_answer: spec.typo });
    expectedScore += spec.points;
    check(hit.accepted === true && hit.tier === spec.tier && hit.points === spec.points, `round ${round} scores ${spec.tier}`, hit);
    check(hit.player.score === expectedScore && hit.player.depth_m === expectedScore * 10, `round ${round} running score`, hit.player);
    await expectRpcError(player, 'submit_answer', { p_game_slug: GAME, p_round: round, p_answer: spec.typo }, 'round_already_resolved');
  }

  const progress = await rpc(player, 'get_my_progress', { p_game_slug: GAME });
  check(progress.player.finished === true && progress.active_round === null, 'dive finished');

  const results = await rpc(player, 'get_results', { p_game_slug: GAME });
  check(results.player.score === expectedScore, 'results score', results.player);
  check(results.rounds.length === 5 && results.histogram.length === 20, 'results shape');

  const caught = await rpc(player, 'get_catch', { p_game_slug: GAME });
  check(caught.rounds.length === 5 && caught.rounds[0].answers[0].tier === 'figlion', 'catch lists figlion first');

  const lb = await rpc(player, 'get_leaderboard', { p_game_slug: GAME });
  check(lb.rows.some((r) => r.display_name === name) && lb.me && lb.me.finished, 'leaderboard includes me');

  // Built frontend must not contain prompts or answers.
  if (!process.env.SKIP_BUNDLE) {
    check(existsSync('dist'), 'dist/ exists (run npm run build first)');
    const files = [];
    const walk = (d) => readdirSync(d).forEach((f) => {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|html|css|json|map)$/.test(p)) files.push(p);
    });
    walk('dist');
    const bundle = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    const secrets = [...PROMPT_TEXTS, 'Periwinkle', 'Jabuticaba', 'Friendster', 'Befunge', 'Falu red'];
    const leaked = secrets.filter((s) => bundle.includes(s));
    check(leaked.length === 0, 'build contains no prompt or answer text', leaked);
  }

  console.log(`\nE2E PASSED (${passed} checks)`);
}

main().catch((err) => {
  console.error(`FAIL  ${err.message}`);
  process.exit(1);
});
