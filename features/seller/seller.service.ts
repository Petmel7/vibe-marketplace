import { SellerProfileNotFoundError, SellerAlreadyOnboardedError } from '@/lib/errors/profile'
import { AlreadyVerifiedError } from '@/lib/errors/seller'
import { createAdminNotification } from '@/features/notifications/notifications.service'
import { SellerVerificationStatus } from '@/app/generated/prisma/client'
import {
  findSellerByUserId,
  createSellerProfile,
  assignSellerRole,
  updateSellerVerificationStatus,
} from './seller.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { SellerProfileDto, SellerOnboardingDto } from './seller.dto'
import { logError } from '@/utils/logger'

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

  void createAdminNotification({
    title: 'Нова заявка продавця',
    message: `Користувач ${user.email} подав заявку на статус продавця${profile.businessName ? ` для "${profile.businessName}"` : ''}.`,
    actionUrl: '/admin/moderation',
    metadata: {
      sellerProfileId: profile.id,
      userId: user.id,
      businessName: profile.businessName,
      verificationStatus: profile.verificationStatus,
      roleTarget: 'admin',
      actorRole: 'SELLER',
    },
  }).catch((error) => {
    logError('seller:onboarding:admin-notification', error, {
      userId: user.id,
      sellerProfileId: profile.id,
    })
  })

  return profile
}

export async function submitVerification(user: SessionUser): Promise<SellerProfileDto> {
  const profile = await findSellerByUserId(user.id)
  if (!profile) throw new SellerProfileNotFoundError()
  if (profile.verificationStatus === SellerVerificationStatus.VERIFIED) throw new AlreadyVerifiedError()

  return updateSellerVerificationStatus(user.id, SellerVerificationStatus.PENDING)
}
