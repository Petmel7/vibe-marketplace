import { prisma } from '@/lib/prisma'
import type { OrderStatus, ProductStatus, UserRole } from '@/app/generated/prisma/client'
import type {
  UserOversightFilters,
  OrderOversightFilters,
  SellerOversightFilters,
  ProductOversightFilters,
} from './admin-oversight.dto'

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function findAllUsers(filters: UserOversightFilters) {
  const { page, limit, search, role } = filters

  const where = {
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(role
      ? {
          roles: {
            some: { role: role as UserRole },
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        roles: { select: { role: true } },
        profile: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return { items, total }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function findAllOrdersOversight(filters: OrderOversightFilters) {
  const { page, limit, status, dateFrom, dateTo } = filters

  const where = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  return { items, total }
}

// ---------------------------------------------------------------------------
// Sellers
// ---------------------------------------------------------------------------

export async function findAllSellersOversight(filters: SellerOversightFilters) {
  const { page, limit, status } = filters

  const where = status
    ? { verificationStatus: status as import('@/app/generated/prisma/client').SellerVerificationStatus }
    : {}

  const [items, total] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      include: {
        user: {
          include: {
            stores: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sellerProfile.count({ where }),
  ])

  return { items, total }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function findAllProductsOversight(filters: ProductOversightFilters) {
  const { page, limit, status, search } = filters

  const where = {
    ...(status ? { status: status as ProductStatus } : {}),
    ...(search
      ? {
          name: { contains: search, mode: 'insensitive' as const },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total }
}
