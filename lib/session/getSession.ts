import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { UnauthorizedError } from '@/lib/errors/auth'
import type { SessionUser } from '@/features/auth/auth.dto'
import { getUserRoles } from '@/features/auth/auth.repository'

/**
 * Returns the currently authenticated user from the session cookie, or null
 * if no valid session exists. Safe to call from Server Components and Route Handlers.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const roles = await getUserRoles(user.id)
  return { id: user.id, email: user.email ?? '', roles }
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
