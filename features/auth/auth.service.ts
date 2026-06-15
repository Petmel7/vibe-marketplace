import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
  ensureUserProvisioned,
  getUserRoles,
} from './auth.repository'
import type { SessionUser } from './auth.dto'
import { emitWelcomeEmailEvent } from '@/features/email/events/email.events'
import { logError } from '@/utils/logger'

/**
 * Syncs a Supabase-authenticated user into our database.
 * On first login: creates User, UserProfile, BuyerProfile, and BUYER role assignment.
 * On subsequent logins: repairs any missing buyer provisioning idempotently.
 */
export async function syncUser(supabaseUser: SupabaseUser): Promise<SessionUser> {
  let created = false

  try {
    const provisioned = await ensureUserProvisioned(
      supabaseUser.id,
      supabaseUser.email ?? ''
    )
    created = provisioned.created
  } catch (error) {
    logError('syncUser:provisioning', error, {
      domain: 'auth',
      userId: supabaseUser.id,
    })
    throw error
  }

  if (created) {
    if (supabaseUser.email) {
      void emitWelcomeEmailEvent({
        userId: supabaseUser.id,
        email: supabaseUser.email,
      }).catch((error) => {
        logError('syncUser:welcome-email', error)
      })
    }
  }
  const roles = await getUserRoles(supabaseUser.id)
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    roles,
  }
}

/**
 * Returns a SessionUser DTO for an already-known Supabase user.
 * Does not create any records — user must already exist in the DB.
 */
export async function getSessionUser(
  supabaseUser: SupabaseUser
): Promise<SessionUser> {
  const roles = await getUserRoles(supabaseUser.id)
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    roles,
  }
}
