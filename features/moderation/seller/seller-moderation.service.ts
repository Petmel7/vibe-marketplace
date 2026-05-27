import { SellerProfileNotFoundError } from '@/lib/errors/profile'
import { InvalidModerationTransitionError } from '@/lib/errors/admin'
import { assertAdminAccess, assertNotSelfModeration } from '@/lib/auth/adminGuards'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  SellerModerationDto,
  SellerModerationQueueDto,
  SellerModerationFilters,
} from './seller-moderation.dto'
import {
  findPendingSellerApprovals,
  findSuspendedSellers,
  findSellerProfileById,
  updateSellerVerificationStatus,
  deactivateSellerStores,
} from './seller-moderation.repository'
import type { SellerProfile } from '@/app/generated/prisma/client'
import {
  emitSellerApprovedEmailEvent,
  emitSellerRejectedEmailEvent,
} from '@/features/email/events/email.events'
import { logError } from '@/utils/logger'

// ---------------------------------------------------------------------------
// DTO mapper
// ---------------------------------------------------------------------------

function toSellerModerationDto(seller: SellerProfile): SellerModerationDto {
  return {
    id: seller.id,
    userId: seller.userId,
    businessName: seller.businessName,
    verificationStatus: seller.verificationStatus,
    moderationReason: seller.moderationReason,
    moderatedAt: seller.moderatedAt,
    moderatedBy: seller.moderatedBy,
    createdAt: seller.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getPendingSellerQueue(
  admin: SessionUser,
  filters: SellerModerationFilters,
): Promise<SellerModerationQueueDto> {
  assertAdminAccess(admin)
  const { items, total } = await findPendingSellerApprovals(filters)
  return {
    items: items.map(toSellerModerationDto),
    total,
    page: filters.page,
    limit: filters.limit,
  }
}

export async function getSuspendedSellers(
  admin: SessionUser,
  filters: SellerModerationFilters,
): Promise<SellerModerationQueueDto> {
  assertAdminAccess(admin)
  const { items, total } = await findSuspendedSellers(filters)
  return {
    items: items.map(toSellerModerationDto),
    total,
    page: filters.page,
    limit: filters.limit,
  }
}

export async function approveSeller(
  admin: SessionUser,
  sellerId: string,
): Promise<SellerModerationDto> {
  assertAdminAccess(admin)

  const seller = await findSellerProfileById(sellerId)
  if (!seller) throw new SellerProfileNotFoundError()

  assertNotSelfModeration(admin.id, seller.userId)

  if (seller.verificationStatus !== 'PENDING') {
    throw new InvalidModerationTransitionError(seller.verificationStatus, 'VERIFIED')
  }

  const updated = await updateSellerVerificationStatus(sellerId, 'VERIFIED', admin.id)
  void emitSellerApprovedEmailEvent({
    sellerUserId: updated.userId,
    businessName: updated.businessName ?? null,
  }).catch((error) => {
    logError('seller-moderation:approve-email', error)
  })
  return toSellerModerationDto(updated)
}

export async function rejectSeller(
  admin: SessionUser,
  sellerId: string,
  reason: string,
): Promise<SellerModerationDto> {
  assertAdminAccess(admin)

  const seller = await findSellerProfileById(sellerId)
  if (!seller) throw new SellerProfileNotFoundError()

  if (seller.verificationStatus !== 'PENDING') {
    throw new InvalidModerationTransitionError(seller.verificationStatus, 'REJECTED')
  }

  const updated = await updateSellerVerificationStatus(sellerId, 'REJECTED', admin.id, reason)
  void emitSellerRejectedEmailEvent({
    sellerUserId: updated.userId,
    businessName: updated.businessName ?? null,
    reason,
  }).catch((error) => {
    logError('seller-moderation:reject-email', error)
  })
  return toSellerModerationDto(updated)
}

export async function suspendSeller(
  admin: SessionUser,
  sellerId: string,
  reason: string,
): Promise<SellerModerationDto> {
  assertAdminAccess(admin)

  const seller = await findSellerProfileById(sellerId)
  if (!seller) throw new SellerProfileNotFoundError()

  if (seller.verificationStatus !== 'VERIFIED') {
    throw new InvalidModerationTransitionError(seller.verificationStatus, 'SUSPENDED')
  }

  const updated = await updateSellerVerificationStatus(sellerId, 'SUSPENDED', admin.id, reason)
  // Deactivate all stores owned by this seller
  await deactivateSellerStores(seller.userId)
  return toSellerModerationDto(updated)
}

export async function reactivateSeller(
  admin: SessionUser,
  sellerId: string,
): Promise<SellerModerationDto> {
  assertAdminAccess(admin)

  const seller = await findSellerProfileById(sellerId)
  if (!seller) throw new SellerProfileNotFoundError()

  if (seller.verificationStatus !== 'SUSPENDED') {
    throw new InvalidModerationTransitionError(seller.verificationStatus, 'VERIFIED')
  }

  const updated = await updateSellerVerificationStatus(sellerId, 'VERIFIED', admin.id)
  return toSellerModerationDto(updated)
}
