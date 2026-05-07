import { ProfileNotFoundError } from '@/lib/errors/profile'
import { findProfileByUserId, updateProfile } from './profile.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { UserProfileDto, UpdateProfileDto } from './profile.dto'

export async function getMyProfile(user: SessionUser): Promise<UserProfileDto> {
  const profile = await findProfileByUserId(user.id)
  if (!profile) throw new ProfileNotFoundError()
  return profile
}

export async function updateMyProfile(
  user: SessionUser,
  data: UpdateProfileDto,
): Promise<UserProfileDto> {
  const profile = await findProfileByUserId(user.id)
  if (!profile) throw new ProfileNotFoundError()
  return updateProfile(user.id, data)
}
