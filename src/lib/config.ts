import { LOCAL_SUPABASE_DEMO_ANON_KEY, LOCAL_SUPABASE_URL } from './localSupabaseDevDefaults'

export interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  gameSlug: string
  usingLocalDefaults: boolean
}

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; missing: string[] }

export interface EnvLike {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  VITE_GAME_SLUG?: string
}

export interface LocalDefaults {
  url: string
  anonKey: string
}

const SLUG_PATTERN = /^[a-z0-9-]{1,40}$/
export const DEFAULT_GAME_SLUG = 'practice'

function clean(value: string | undefined): string {
  return (value ?? '').trim()
}

/**
 * Resolves config from env. When both Supabase vars are unset and `localDefaults` is given
 * (dev server only), falls back to the local Supabase stack.
 */
export function resolveConfig(env: EnvLike, localDefaults: LocalDefaults | null): ConfigResult {
  const url = clean(env.VITE_SUPABASE_URL)
  const key = clean(env.VITE_SUPABASE_ANON_KEY)
  const slugRaw = clean(env.VITE_GAME_SLUG)
  const gameSlug = SLUG_PATTERN.test(slugRaw) ? slugRaw : DEFAULT_GAME_SLUG

  if (url && key) {
    return { ok: true, config: { supabaseUrl: url, supabaseAnonKey: key, gameSlug, usingLocalDefaults: false } }
  }
  if (!url && !key && localDefaults) {
    return {
      ok: true,
      config: { supabaseUrl: localDefaults.url, supabaseAnonKey: localDefaults.anonKey, gameSlug, usingLocalDefaults: true },
    }
  }
  const missing: string[] = []
  if (!url) missing.push('VITE_SUPABASE_URL')
  if (!key) missing.push('VITE_SUPABASE_ANON_KEY')
  return { ok: false, missing }
}

// import.meta.env.DEV is statically false in production builds, so the local defaults are
// dropped from the production bundle.
export const appConfig: ConfigResult = resolveConfig(
  {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_GAME_SLUG: import.meta.env.VITE_GAME_SLUG,
  },
  import.meta.env.DEV ? { url: LOCAL_SUPABASE_URL, anonKey: LOCAL_SUPABASE_DEMO_ANON_KEY } : null,
)
