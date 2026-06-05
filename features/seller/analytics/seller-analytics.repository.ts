import Decimal from 'decimal.js'
import { ItemFulfillmentStatus, OrderStatus, RefundRequestStatus } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { TopProductEntry } from './seller-analytics.dto'

export type SellerAnalyticsOrderItemRow = {
  id: string
  orderId: string
  quantity: number
  createdAt: Date
  fulfillmentStatus: ItemFulfillmentStatus
  productNameSnapshot: string
  variantId: string
  unitPriceSnapshot: Decimal
}

const SELLER_REVENUE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.paid,
  OrderStatus.confirmed,
  OrderStatus.processing,
  OrderStatus.shipped,
  OrderStatus.delivered,
]

export async function getTotalRevenue(storeId: string): Promise<Decimal> {
  const items = await prisma.orderItem.findMany({
    where: { storeId },
    select: { unitPriceSnapshot: true, quantity: true },
  })
  return items.reduce(
    (sum, i) => sum.plus(new Decimal(i.unitPriceSnapshot.toString()).mul(i.quantity)),
    new Decimal(0),
  )
}

export async function getOrderCount(storeId: string): Promise<number> {
  const items = await prisma.orderItem.findMany({
    where: { storeId },
    select: { orderId: true },
  })
  return new Set(items.map((i) => i.orderId)).size
}

export async function getTotalProductsSold(storeId: string): Promise<number> {
  const result = await prisma.orderItem.aggregate({
    where: { storeId },
    _sum: { quantity: true },
  })
  return result._sum.quantity ?? 0
}

export async function getTopProducts(storeId: string, limit: number): Promise<TopProductEntry[]> {
  const items = await prisma.orderItem.findMany({
    where: { storeId },
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
      revenue: stats.revenue.toFixed(2),
    }))
}

export async function getRevenueLast30Days(storeId: string): Promise<Decimal> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const items = await prisma.orderItem.findMany({
    where: {
      storeId,
      createdAt: { gte: since },
    },
    select: { unitPriceSnapshot: true, quantity: true },
  })
  return items.reduce(
    (sum, i) => sum.plus(new Decimal(i.unitPriceSnapshot.toString()).mul(i.quantity)),
    new Decimal(0),
  )
}

export async function getSellerOrderItemsForRange(
  storeId: string,
  from: Date,
  to: Date,
): Promise<SellerAnalyticsOrderItemRow[]> {
  return prisma.orderItem.findMany({
    where: {
      storeId,
      createdAt: { gte: from, lte: to },
      order: {
        status: { in: SELLER_REVENUE_ORDER_STATUSES },
      },
    },
    select: {
      id: true,
      orderId: true,
      quantity: true,
      createdAt: true,
      fulfillmentStatus: true,
      productNameSnapshot: true,
      variantId: true,
      unitPriceSnapshot: true,
    },
  })
}

export async function getSellerRefundMetricsForRange(
  storeId: string,
  from: Date,
  to: Date,
): Promise<{ refundCount: number; refundAmount: Decimal }> {
  const requests = await prisma.refundRequest.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      orderItem: { storeId },
    },
    select: {
      amount: true,
      status: true,
    },
  })

  return {
    refundCount: requests.length,
    refundAmount: requests.reduce((sum, request) => {
      if (request.status !== RefundRequestStatus.SUCCEEDED) {
        return sum
      }

      return sum.plus(request.amount.toString())
    }, new Decimal(0)),
  }
}

export async function getSellerDisputeCountForRange(
  storeId: string,
  from: Date,
  to: Date,
): Promise<number> {
  return prisma.dispute.count({
    where: {
      storeId,
      createdAt: { gte: from, lte: to },
    },
  })
}

export async function getSellerBalanceSnapshot(storeId: string): Promise<{
  availableAmount: Decimal
  pendingAmount: Decimal
  paidOutAmount: Decimal
} | null> {
  return prisma.sellerBalance.findUnique({
    where: { storeId },
    select: {
      availableAmount: true,
      pendingAmount: true,
      paidOutAmount: true,
    },
  })
}
