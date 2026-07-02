import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { UnauthorizedError } from '@/lib/errors/auth'
import type { SessionUser } from '@/features/auth/auth.dto'
import { getSessionUser } from '@/features/auth/auth.service'
import { measureServerOperation } from '@/lib/observability/server-timing'
import { logInfo } from '@/utils/logger'

/**
 * Returns the currently authenticated user from the session cookie, or null
 * if no valid session exists. Safe to call from Server Components and Route Handlers.
 * Read-only only: provisioning must happen through the auth lifecycle, not page rendering.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return measureServerOperation(
    'getCurrentUser',
    {
      component: 'lib/session/getSession',
      auth: 'supabase-session',
    },
    async () => {
      logInfo('session:getCurrentUser:before-create-server-client', {
        domain: 'auth',
      })
      const supabase = await createServerClient()
      logInfo('session:getCurrentUser:after-create-server-client', {
        domain: 'auth',
      })
      const {
        data: { user },
      } = await supabase.auth.getUser()
      logInfo('session:getCurrentUser:after-supabase-getUser', {
        domain: 'auth',
        hasUser: Boolean(user),
      })
      if (!user) return null
      logInfo('session:getCurrentUser:before-getSessionUser', {
        domain: 'auth',
        userId: user.id,
      })
      const sessionUser = await getSessionUser(user)
      logInfo('session:getCurrentUser:after-getSessionUser', {
        domain: 'auth',
        userId: sessionUser.id,
      })
      return sessionUser
    },
  )
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
