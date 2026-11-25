// DEV ONLY. Used when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset and the app runs
// under `vite` (import.meta.env.DEV). Points at the local Supabase CLI stack (`supabase start`).
// The key is the Supabase CLI's public demo anon JWT, identical on every machine; it only works
// against a local stack and is never used by a production build.

export const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'

export const LOCAL_SUPABASE_DEMO_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
