import { prisma } from '@/lib/prisma'

/**
 * Return true when an active product with the given id exists in the database.
 * Used by multiple features (wishlist, review, viewed) to guard against
 * referencing products that are missing or soft-deleted.
 */
export async function productExists(productId: string): Promise<boolean> {
  const count = await prisma.product.count({
    where: { id: productId, isActive: true },
  })
  return count > 0
}
