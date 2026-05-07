import { prisma } from '@/lib/prisma'
import { UserRole } from '@/app/generated/prisma/client'
import type { SellerProfileDto, SellerOnboardingDto } from './seller.dto'

export async function findSellerByUserId(userId: string): Promise<SellerProfileDto | null> {
  return prisma.sellerProfile.findUnique({ where: { userId } })
}

export async function createSellerProfile(
  userId: string,
  data: SellerOnboardingDto,
): Promise<SellerProfileDto> {
  return prisma.sellerProfile.create({
    data: {
      userId,
      businessName: data.businessName,
      taxId: data.taxId ?? null,
      updatedAt: new Date(),
    },
  })
}

export async function assignSellerRole(userId: string): Promise<void> {
  await prisma.userRoleAssignment.upsert({
    where: { userId_role: { userId, role: UserRole.SELLER } },
    create: { userId, role: UserRole.SELLER },
    update: {},
  })
}
