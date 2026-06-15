import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { UnauthorizedError } from '@/lib/errors/auth'
import type { SessionUser } from '@/features/auth/auth.dto'
import { getSessionUser } from '@/features/auth/auth.service'

/**
 * Returns the currently authenticated user from the session cookie, or null
 * if no valid session exists. Safe to call from Server Components and Route Handlers.
 * Read-only only: provisioning must happen through the auth lifecycle, not page rendering.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return getSessionUser(user)
})

/**
 * Returns the currently authenticated user or throws UnauthorizedError.
 * Use in protected Route Handlers and Server Actions.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}
