'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPublicEnv } from '@/config/env'

let cachedSupabaseBrowser: SupabaseClient | null = null
let publicEnvWarningShown = false

function logPublicEnvDiagnostic(error: unknown) {
  if (publicEnvWarningShown || process.env.NODE_ENV === 'production') {
    return
  }

  publicEnvWarningShown = true
  console.error(
    '[supabase-browser] public Supabase environment is missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local or .env, restart the dev server, and clear .next if needed.',
    error instanceof Error ? { message: error.message } : undefined,
  )
}

export function getSupabaseBrowser(): SupabaseClient {
  if (cachedSupabaseBrowser) {
    return cachedSupabaseBrowser
  }

  try {
    const publicEnv = getPublicEnv()
    cachedSupabaseBrowser = createBrowserClient(
      publicEnv.supabaseUrl,
      publicEnv.supabaseAnonKey,
    )

    return cachedSupabaseBrowser
  } catch (error) {
    logPublicEnvDiagnostic(error)
    throw error
  }
}
