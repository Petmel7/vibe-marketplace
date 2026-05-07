import { AdminProfileNotFoundError } from '@/lib/errors/profile'
import { findAdminByUserId } from './admin.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { AdminProfileDto } from './admin.dto'

export async function getMyAdminProfile(user: SessionUser): Promise<AdminProfileDto> {
  const profile = await findAdminByUserId(user.id)
  if (!profile) throw new AdminProfileNotFoundError()
  return profile
}
