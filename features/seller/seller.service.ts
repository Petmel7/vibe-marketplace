import { SellerProfileNotFoundError, SellerAlreadyOnboardedError } from '@/lib/errors/profile'
import { AlreadyVerifiedError } from '@/lib/errors/seller'
import { findSellerByUserId, createSellerProfile, assignSellerRole } from './seller.repository'
import { prisma } from '@/lib/prisma'
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

export async function submitVerification(user: SessionUser): Promise<SellerProfileDto> {
  const profile = await findSellerByUserId(user.id)
  if (!profile) throw new SellerProfileNotFoundError()
  if (profile.verificationStatus === 'VERIFIED') throw new AlreadyVerifiedError()

  return prisma.sellerProfile.update({
    where: { userId: user.id },
    data: { verificationStatus: 'PENDING', updatedAt: new Date() },
  })
}
