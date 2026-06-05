import Decimal from 'decimal.js'
import { OrderStatus, PaymentMethod, PaymentStatus, RefundRequestStatus, RiskLevel } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'

const GMV_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.paid,
  OrderStatus.confirmed,
  OrderStatus.processing,
  OrderStatus.shipped,
  OrderStatus.delivered,
]

export type AdminAnalyticsOrderRow = {
  id: string
  createdAt: Date
  totalAmount: Decimal
  status: string
  payments: { method: PaymentMethod; status: PaymentStatus }[]
}

export type AdminAnalyticsOrderItemRow = {
  orderId: string
  createdAt: Date
  quantity: number
  unitPriceSnapshot: Decimal
  productNameSnapshot: string
  variantId: string
  storeId: string
  store: { name: string; ownerId: string }
  variant: {
    product: {
      category: { id: string; name: string } | null
    }
  }
}

export type AdminAnalyticsCommissionRow = {
  createdAt: Date
  commissionAmount: Decimal
  sellerNetAmount: Decimal
}

export type AdminAnalyticsRefundRow = {
  createdAt: Date
  amount: Decimal
  status: RefundRequestStatus
}

export type AdminAnalyticsDisputeRow = {
  createdAt: Date
}

export type AdminAnalyticsSellerGrowthRow = {
  createdAt: Date
}

export async function getGMV(): Promise<Decimal> {
  const result = await prisma.order.aggregate({
    where: {
      status: { in: GMV_ORDER_STATUSES },
    },
    _sum: { totalAmount: true },
  })
  return new Decimal(result._sum?.totalAmount?.toString() ?? '0')
}

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

export async function getTopSellers(
  limit: number,
): Promise<
  { sellerId: string; storeId: string; storeName: string; revenue: Decimal; orderCount: number }[]
> {
  const items = await prisma.orderItem.findMany({
    select: {
      storeId: true,
      unitPriceSnapshot: true,
      quantity: true,
      orderId: true,
      store: { select: { id: true, name: true, ownerId: true } },
    },
  })

  const grouped = new Map<
    string,
    { storeName: string; ownerId: string; revenue: Decimal; orderIds: Set<string> }
  >()

  for (const item of items) {
    const existing = grouped.get(item.storeId)
    const itemRevenue = new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)

    if (existing) {
      existing.revenue = existing.revenue.plus(itemRevenue)
      existing.orderIds.add(item.orderId)
      continue
    }

    grouped.set(item.storeId, {
      storeName: item.store.name,
      ownerId: item.store.ownerId,
      revenue: itemRevenue,
      orderIds: new Set([item.orderId]),
    })
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[1].revenue.comparedTo(left[1].revenue))
    .slice(0, limit)
    .map(([storeId, stats]) => ({
      sellerId: stats.ownerId,
      storeId,
      storeName: stats.storeName,
      revenue: stats.revenue,
      orderCount: stats.orderIds.size,
    }))
}

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
    const existing = grouped.get(item.productNameSnapshot)
    const itemRevenue = new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)

    if (existing) {
      existing.totalSold += item.quantity
      existing.revenue = existing.revenue.plus(itemRevenue)
      continue
    }

    grouped.set(item.productNameSnapshot, {
      totalSold: item.quantity,
      revenue: itemRevenue,
      variantId: item.variantId,
    })
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[1].totalSold - left[1].totalSold)
    .slice(0, limit)
    .map(([name, stats]) => ({
      productId: stats.variantId,
      name,
      totalSold: stats.totalSold,
      revenue: stats.revenue,
    }))
}

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

export async function getOrdersForRange(from: Date, to: Date): Promise<AdminAnalyticsOrderRow[]> {
  return prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      status: true,
      payments: {
        select: {
          method: true,
          status: true,
        },
      },
    },
  })
}

export async function getOrderItemsForRange(
  from: Date,
  to: Date,
): Promise<AdminAnalyticsOrderItemRow[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      order: {
        status: { in: GMV_ORDER_STATUSES },
      },
    },
    select: {
      orderId: true,
      createdAt: true,
      quantity: true,
      unitPriceSnapshot: true,
      productNameSnapshot: true,
      variantId: true,
      storeId: true,
      store: {
        select: {
          name: true,
          ownerId: true,
        },
      },
      variant: {
        select: {
          product: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return items.map((item) => ({
    orderId: item.orderId,
    createdAt: item.createdAt,
    quantity: item.quantity,
    unitPriceSnapshot: item.unitPriceSnapshot,
    productNameSnapshot: item.productNameSnapshot,
    variantId: item.variantId,
    storeId: item.storeId,
    store: {
      name: item.store.name,
      ownerId: item.store.ownerId,
    },
    variant: {
      product: {
        category: item.variant.product.category
          ? {
              id: item.variant.product.category.id,
              name: item.variant.product.category.name,
            }
          : null,
      },
    },
  }))
}

export async function getCommissionRowsForRange(
  from: Date,
  to: Date,
): Promise<AdminAnalyticsCommissionRow[]> {
  return prisma.platformCommission.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    select: {
      createdAt: true,
      commissionAmount: true,
      sellerNetAmount: true,
    },
  })
}

export async function getRefundRowsForRange(
  from: Date,
  to: Date,
): Promise<AdminAnalyticsRefundRow[]> {
  return prisma.refundRequest.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    select: {
      createdAt: true,
      amount: true,
      status: true,
    },
  })
}

export async function getDisputeRowsForRange(
  from: Date,
  to: Date,
): Promise<AdminAnalyticsDisputeRow[]> {
  return prisma.dispute.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    select: {
      createdAt: true,
    },
  })
}

export async function getSellerGrowthRowsForRange(
  from: Date,
  to: Date,
): Promise<AdminAnalyticsSellerGrowthRow[]> {
  return prisma.sellerProfile.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    select: {
      createdAt: true,
    },
  })
}

export async function getActiveSellerCount(): Promise<number> {
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    select: { ownerId: true },
  })

  return new Set(stores.map((store) => store.ownerId)).size
}

export async function getPublishedProductCount(): Promise<number> {
  return prisma.product.count({
    where: { status: 'PUBLISHED' },
  })
}

export async function getRiskSummary(): Promise<{
  low: number
  medium: number
  high: number
  critical: number
}> {
  const profiles = await prisma.riskProfile.groupBy({
    by: ['level'],
    _count: { level: true },
  })

  return {
    low: profiles.find((profile) => profile.level === RiskLevel.LOW)?._count.level ?? 0,
    medium: profiles.find((profile) => profile.level === RiskLevel.MEDIUM)?._count.level ?? 0,
    high: profiles.find((profile) => profile.level === RiskLevel.HIGH)?._count.level ?? 0,
    critical: profiles.find((profile) => profile.level === RiskLevel.CRITICAL)?._count.level ?? 0,
  }
}
