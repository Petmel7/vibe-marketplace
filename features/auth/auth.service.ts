import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
  findUserById,
  createUserWithProfile,
  getUserRoles,
} from './auth.repository'
import type { SessionUser } from './auth.dto'

/**
 * Syncs a Supabase-authenticated user into our database.
 * On first login: creates User, UserProfile, BuyerProfile, and BUYER role assignment.
 * On subsequent logins: reads existing roles only.
 */
export async function syncUser(supabaseUser: SupabaseUser): Promise<SessionUser> {
  const existing = await findUserById(supabaseUser.id)
  if (!existing) {
    await createUserWithProfile(supabaseUser.id, supabaseUser.email ?? '')
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
