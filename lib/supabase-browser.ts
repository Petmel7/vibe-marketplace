import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for browser-side use.
 * Persists the session in localStorage automatically.
 * Only uses the public anon key — never the service role key.
 */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
