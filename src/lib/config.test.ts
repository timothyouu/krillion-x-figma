import { describe, expect, it } from 'vitest'
import { resolveConfig } from './config'
import { cleanDisplayName, isValidDisplayName } from './names'
import { codeFromMessage } from './errors'

const LOCAL = { url: 'http://127.0.0.1:54321', anonKey: 'local-key' }

describe('resolveConfig', () => {
  it('uses env vars when both are set', () => {
    const r = resolveConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }, LOCAL)
    expect(r).toEqual({
      ok: true,
      config: { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'k', gameSlug: 'practice', usingLocalDefaults: false },
    })
  })

  it('falls back to the local stack in dev when nothing is set', () => {
    const r = resolveConfig({}, LOCAL)
    expect(r.ok && r.config.usingLocalDefaults && r.config.supabaseUrl).toBe(LOCAL.url)
  })

  it('reports missing vars in production (no local defaults)', () => {
    expect(resolveConfig({}, null)).toEqual({ ok: false, missing: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] })
    expect(resolveConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' }, LOCAL)).toEqual({
      ok: false,
      missing: ['VITE_SUPABASE_ANON_KEY'],
    })
  })

  it('validates the game slug', () => {
    const ok = resolveConfig({ VITE_GAME_SLUG: 'midyear-2026' }, LOCAL)
    expect(ok.ok && ok.config.gameSlug).toBe('midyear-2026')
    const bad = resolveConfig({ VITE_GAME_SLUG: 'Bad Slug!' }, LOCAL)
    expect(bad.ok && bad.config.gameSlug).toBe('practice')
  })
})

describe('display names', () => {
  it('collapses whitespace like join_game', () => {
    expect(cleanDisplayName('  Ada   Lovelace ')).toBe('Ada Lovelace')
    expect(isValidDisplayName('   ')).toBe(false)
    expect(isValidDisplayName('x'.repeat(25))).toBe(false)
  })
})

describe('codeFromMessage', () => {
  it('maps RPC exception text to codes', () => {
    expect(codeFromMessage('game_not_open')).toBe('game_not_open')
    expect(codeFromMessage('ERROR: time_up')).toBe('time_up')
    expect(codeFromMessage('TypeError: Failed to fetch')).toBe('network')
    expect(codeFromMessage('weird')).toBe('unknown')
  })
})
