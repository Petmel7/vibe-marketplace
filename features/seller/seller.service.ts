import { SellerProfileNotFoundError, SellerAlreadyOnboardedError } from '@/lib/errors/profile'
import { findSellerByUserId, createSellerProfile, assignSellerRole } from './seller.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { SellerProfileDto, SellerOnboardingDto } from './seller.dto'

export async function getMySellerProfile(user: SessionUser): Promise<SellerProfileDto> {
  const profile = await findSellerByUserId(user.id)
  if (!profile) throw new SellerProfileNotFoundError()
  return profile
}

export async function initiateSelling(
  user: SessionUser,
  data: SellerOnboardingDto,
): Promise<SellerProfileDto> {
  const existing = await findSellerByUserId(user.id)
  if (existing) throw new SellerAlreadyOnboardedError()

  const profile = await createSellerProfile(user.id, data)
  await assignSellerRole(user.id)
  return profile
}
