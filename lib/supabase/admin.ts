import { createClient } from '@supabase/supabase-js'
import { getServerEnv } from '@/config/env'

/**
 * Creates a Supabase admin client using the service role key.
 * Must only be used server-side. Never expose to the browser.
 * Creates a fresh instance — do not cache across requests.
 */
export function createAdminClient() {
  const env = getServerEnv()
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin environment variables are not configured')
  }

  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
