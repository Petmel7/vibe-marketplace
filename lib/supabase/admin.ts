import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client using the service role key.
 * Must only be used server-side. Never expose to the browser.
 * Creates a fresh instance — do not cache across requests.
 */
export function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } }
  )
}
