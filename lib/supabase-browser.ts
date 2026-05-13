
import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/config/env'

export const supabaseBrowser = createBrowserClient(
  env.supabaseUrl,
  env.supabaseAnonKey
)
