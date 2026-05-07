import { ProfileNotFoundError } from '@/lib/errors/profile'
import { findBuyerByUserId } from './buyer.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { BuyerProfileDto } from './buyer.dto'

export async function getMyBuyerProfile(user: SessionUser): Promise<BuyerProfileDto> {
  const profile = await findBuyerByUserId(user.id)
  if (!profile) throw new ProfileNotFoundError()
  return profile
}
