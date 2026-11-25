import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { appConfig } from './config'

let client: SupabaseClient | null = null

/** The shared Supabase client, or null when the app is not configured. */
export function getSupabase(): SupabaseClient | null {
  if (!appConfig.ok) return null
  if (!client) {
    client = createClient(appConfig.config.supabaseUrl, appConfig.config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'figillion-auth' },
    })
  }
  return client
}

export function gameSlug(): string {
  return appConfig.ok ? appConfig.config.gameSlug : 'practice'
}
