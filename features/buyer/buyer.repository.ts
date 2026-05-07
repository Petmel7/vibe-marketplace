import { prisma } from '@/lib/prisma'
import type { BuyerProfileDto } from './buyer.dto'

export async function findBuyerByUserId(userId: string): Promise<BuyerProfileDto | null> {
  return prisma.buyerProfile.findUnique({ where: { userId } })
}

export async function updateDefaultAddress(
  userId: string,
  addressId: string,
): Promise<BuyerProfileDto> {
  return prisma.buyerProfile.update({
    where: { userId },
    data: { defaultShippingAddressId: addressId },
  })
}
