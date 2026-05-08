import Decimal from 'decimal.js'
import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// GMV — sum of all paid/completed order totals
// ---------------------------------------------------------------------------

export async function getGMV(): Promise<Decimal> {
  const result = await prisma.order.aggregate({
    where: {
      status: { in: ['paid', 'processing', 'shipped', 'delivered'] },
    },
    _sum: { totalAmount: true },
  })
  return new Decimal(result._sum.totalAmount?.toString() ?? '0')
}

// ---------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------

export async function getTotalOrderCount(): Promise<number> {
  return prisma.order.count()
}

export async function getTotalSellerCount(): Promise<number> {
  return prisma.sellerProfile.count()
}

export async function getTotalBuyerCount(): Promise<number> {
  return prisma.buyerProfile.count()
}

export async function getTotalProductCount(): Promise<number> {
  return prisma.product.count()
}

// ---------------------------------------------------------------------------
// Top sellers — aggregate revenue and order count by store
// ---------------------------------------------------------------------------

export async function getTopSellers(
  limit: number,
): Promise<
  { sellerId: string; storeName: string; revenue: Decimal; orderCount: number }[]
> {
  // Pull all order items with store info
  const items = await prisma.orderItem.findMany({
    select: {
      storeId: true,
      unitPriceSnapshot: true,
      quantity: true,
      orderId: true,
      store: { select: { id: true, name: true, ownerId: true } },
    },
  })

  // Group by store
  const grouped = new Map<
    string,
    { storeName: string; ownerId: string; revenue: Decimal; orderIds: Set<string> }
  >()

  for (const item of items) {
    const key = item.storeId
    const existing = grouped.get(key)
    const itemRevenue = new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)

    if (existing) {
      existing.revenue = existing.revenue.plus(itemRevenue)
      existing.orderIds.add(item.orderId)
    } else {
      grouped.set(key, {
        storeName: item.store.name,
        ownerId: item.store.ownerId,
        revenue: itemRevenue,
        orderIds: new Set([item.orderId]),
      })
    }
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[1].revenue.comparedTo(a[1].revenue))
    .slice(0, limit)
    .map(([storeId, stats]) => ({
      sellerId: stats.ownerId,
      storeName: stats.storeName,
      revenue: stats.revenue,
      orderCount: stats.orderIds.size,
    }))
}

// ---------------------------------------------------------------------------
// Top products — aggregate quantity sold and revenue
// ---------------------------------------------------------------------------

export async function getTopProducts(
  limit: number,
): Promise<{ productId: string; name: string; totalSold: number; revenue: Decimal }[]> {
  const items = await prisma.orderItem.findMany({
    select: {
      productNameSnapshot: true,
      unitPriceSnapshot: true,
      quantity: true,
      variantId: true,
    },
  })

  const grouped = new Map<
    string,
    { totalSold: number; revenue: Decimal; variantId: string }
  >()

  for (const item of items) {
    const key = item.productNameSnapshot
    const existing = grouped.get(key)
    const itemRevenue = new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)

    if (existing) {
      existing.totalSold += item.quantity
      existing.revenue = existing.revenue.plus(itemRevenue)
    } else {
      grouped.set(key, {
        totalSold: item.quantity,
        revenue: itemRevenue,
        variantId: item.variantId,
      })
    }
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[1].totalSold - a[1].totalSold)
    .slice(0, limit)
    .map(([name, stats]) => ({
      productId: stats.variantId,
      name,
      totalSold: stats.totalSold,
      revenue: stats.revenue,
    }))
}

// ---------------------------------------------------------------------------
// Growth metrics
// ---------------------------------------------------------------------------

export async function getSellerGrowthLast30Days(): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return prisma.sellerProfile.count({
    where: { createdAt: { gte: since } },
  })
}

export async function getOrderGrowthLast30Days(): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return prisma.order.count({
    where: { createdAt: { gte: since } },
  })
}

// ---------------------------------------------------------------------------
// Moderation stats
// ---------------------------------------------------------------------------

export async function getModerationStats(): Promise<{
  pendingSellerApprovals: number
  pendingProductApprovals: number
  suspendedSellers: number
  rejectedProducts: number
}> {
  const [
    pendingSellerApprovals,
    pendingProductApprovals,
    suspendedSellers,
    rejectedProducts,
  ] = await Promise.all([
    prisma.sellerProfile.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.sellerProfile.count({ where: { verificationStatus: 'SUSPENDED' } }),
    prisma.product.count({ where: { status: 'REJECTED' } }),
  ])

  return {
    pendingSellerApprovals,
    pendingProductApprovals,
    suspendedSellers,
    rejectedProducts,
  }
}
