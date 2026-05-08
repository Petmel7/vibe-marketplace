import Decimal from 'decimal.js'
import { prisma } from '@/lib/prisma'
import type { TopProductEntry } from './seller-analytics.dto'

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

  // Group by productNameSnapshot in JS
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
      productId: stats.variantId, // best proxy without a join
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
