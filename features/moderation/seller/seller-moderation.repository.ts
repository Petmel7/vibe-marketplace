import { prisma } from '@/lib/prisma'
import type { SellerProfile, SellerVerificationStatus } from '@/app/generated/prisma/client'
import type { SellerModerationFilters } from './seller-moderation.dto'

export async function findPendingSellerApprovals(
  filters: SellerModerationFilters,
): Promise<{ items: SellerProfile[]; total: number }> {
  const { page, limit } = filters
  const where = { verificationStatus: 'PENDING' as SellerVerificationStatus }

  const [items, total] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sellerProfile.count({ where }),
  ])

  return { items, total }
}

export async function findSuspendedSellers(
  filters: SellerModerationFilters,
): Promise<{ items: SellerProfile[]; total: number }> {
  const { page, limit } = filters
  const where = { verificationStatus: 'SUSPENDED' as SellerVerificationStatus }

  const [items, total] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sellerProfile.count({ where }),
  ])

  return { items, total }
}

export async function findRejectedSellers(
  filters: SellerModerationFilters,
): Promise<{ items: SellerProfile[]; total: number }> {
  const { page, limit } = filters
  const where = { verificationStatus: 'REJECTED' as SellerVerificationStatus }

  const [items, total] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sellerProfile.count({ where }),
  ])

  return { items, total }
}

export async function findAllSellers(
  filters: SellerModerationFilters,
): Promise<{ items: SellerProfile[]; total: number }> {
  const { page, limit } = filters

  const [items, total] = await Promise.all([
    prisma.sellerProfile.findMany({
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sellerProfile.count(),
  ])

  return { items, total }
}

export async function findSellerProfileById(id: string): Promise<SellerProfile | null> {
  return prisma.sellerProfile.findUnique({ where: { id } })
}

export async function updateSellerVerificationStatus(
  id: string,
  status: SellerVerificationStatus,
  adminId: string,
  reason?: string,
): Promise<SellerProfile> {
  return prisma.sellerProfile.update({
    where: { id },
    data: {
      verificationStatus: status,
      moderationReason: reason ?? null,
      moderatedAt: new Date(),
      moderatedBy: adminId,
      updatedAt: new Date(),
    },
  })
}

export async function deactivateSellerStores(sellerUserId: string): Promise<void> {
  await prisma.store.updateMany({
    where: { ownerId: sellerUserId },
    data: { isActive: false, updatedAt: new Date() },
  })
}
