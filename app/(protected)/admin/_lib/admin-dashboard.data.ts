import { z } from 'zod'
import { AdminProfileNotFoundError } from '@/lib/errors/profile'
import { getMyAdminProfile } from '@/features/admin/admin.service'
import { getMarketplaceAnalytics } from '@/features/admin/analytics/admin-analytics.service'
import {
  getAllOrders,
  getAllProducts,
  getAllSellers,
  getAllUsers,
} from '@/features/admin/oversight/admin-oversight.service'
import {
  orderOversightFilterSchema,
  productOversightFilterSchema,
  sellerOversightFilterSchema,
  userOversightFilterSchema,
} from '@/features/admin/oversight/admin-oversight.schema'
import { getPendingSellerQueue, getSuspendedSellers } from '@/features/moderation/seller/seller-moderation.service'
import { getPendingProductQueue, getRejectedProducts } from '@/features/moderation/product/product-moderation.service'
import type { SessionUser } from '@/types/auth'

const moderationPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(6),
})

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  const entries = Object.entries(searchParams).map(([key, value]) => [
    key,
    Array.isArray(value) ? value[0] : value,
  ])

  return Object.fromEntries(entries)
}

function parseWithSchema<T extends z.ZodTypeAny>(schema: T, searchParams: RawSearchParams): z.infer<T> {
  const parsed = schema.safeParse(normalizeSearchParams(searchParams))
  return parsed.success ? parsed.data : schema.parse({})
}

export async function getAdminLayoutData(user: SessionUser) {
  try {
    const adminProfile = await getMyAdminProfile(user)

    return {
      user,
      adminProfile,
    }
  } catch (error) {
    if (error instanceof AdminProfileNotFoundError) {
      return {
        user,
        adminProfile: null,
      }
    }

    throw error
  }
}

export async function getAdminOverviewData(user: SessionUser) {
  const [analytics, pendingSellerQueue, pendingProductQueue, suspendedSellerQueue, rejectedProductQueue] =
    await Promise.all([
      getMarketplaceAnalytics(user),
      getPendingSellerQueue(user, { page: 1, limit: 5 }),
      getPendingProductQueue(user, { page: 1, limit: 5 }),
      getSuspendedSellers(user, { page: 1, limit: 5 }),
      getRejectedProducts(user, { page: 1, limit: 5 }),
    ])

  return {
    analytics,
    pendingSellerQueue,
    pendingProductQueue,
    suspendedSellerQueue,
    rejectedProductQueue,
  }
}

export async function getAdminModerationPageData(user: SessionUser) {
  const filters = moderationPaginationSchema.parse({})

  const [pendingSellerQueue, pendingProductQueue, suspendedSellerQueue, rejectedProductQueue] =
    await Promise.all([
      getPendingSellerQueue(user, filters),
      getPendingProductQueue(user, filters),
      getSuspendedSellers(user, filters),
      getRejectedProducts(user, filters),
    ])

  return {
    pendingSellerQueue,
    pendingProductQueue,
    suspendedSellerQueue,
    rejectedProductQueue,
  }
}

export async function getAdminUsersPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(userOversightFilterSchema, searchParams)
  const data = await getAllUsers(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminOrdersPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(orderOversightFilterSchema, searchParams)
  const data = await getAllOrders(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminSellersPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(sellerOversightFilterSchema, searchParams)
  const [data, analytics] = await Promise.all([
    getAllSellers(user, filters),
    getMarketplaceAnalytics(user),
  ])

  return {
    filters,
    analytics,
    ...data,
  }
}

export async function getAdminProductsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(productOversightFilterSchema, searchParams)
  const [data, rejectedQueue] = await Promise.all([
    getAllProducts(user, filters),
    getRejectedProducts(user, { page: 1, limit: 5 }),
  ])

  return {
    filters,
    rejectedQueue,
    ...data,
  }
}

export async function getAdminAnalyticsPageData(user: SessionUser) {
  return getMarketplaceAnalytics(user)
}
