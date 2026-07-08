import { z } from 'zod'
import { AdminProfileNotFoundError } from '@/lib/errors/profile'
import { getMyAdminProfile } from '@/features/admin/admin.service'
import {
  getMarketplaceAnalytics,
  getMarketplaceOverviewAnalytics,
} from '@/features/admin/analytics/admin-analytics.service'
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
import { getAdminReviews } from '@/features/review/review.service'
import { adminReviewListQuerySchema } from '@/features/review/review.schema'
import type { SessionUser } from '@/types/auth'
import { measureServerOperation } from '@/lib/observability/server-timing'
import { logInfo } from '@/utils/logger'

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
    logInfo('admin-layout-data:before-get-my-admin-profile', {
      domain: 'admin',
      route: '/admin',
      userId: user.id,
    })
    const adminProfile = await getMyAdminProfile(user)
    logInfo('admin-layout-data:after-get-my-admin-profile', {
      domain: 'admin',
      route: '/admin',
      userId: user.id,
      hasAdminProfile: Boolean(adminProfile),
    })

    return {
      user,
      adminProfile,
    }
  } catch (error) {
    if (error instanceof AdminProfileNotFoundError) {
      logInfo('admin-layout-data:admin-profile-not-found', {
        domain: 'admin',
        route: '/admin',
        userId: user.id,
      })
      return {
        user,
        adminProfile: null,
      }
    }

    throw error
  }
}

export async function getAdminOverviewData(user: SessionUser) {
  logInfo('admin-overview:before-promise-all', {
    domain: 'admin',
    route: '/admin',
    adminId: user.id,
  })
  const [analytics, pendingSellerQueue, pendingProductQueue, suspendedSellerQueue, rejectedProductQueue] =
    await measureServerOperation(
      'getAdminOverviewData',
      {
        route: '/admin',
        component: 'app/(protected)/admin/_lib/admin-dashboard.data',
        adminId: user.id,
      },
      () =>
        Promise.all([
          getMarketplaceOverviewAnalytics(user),
          getPendingSellerQueue(user, { page: 1, limit: 5 }),
          getPendingProductQueue(user, { page: 1, limit: 5 }),
          getSuspendedSellers(user, { page: 1, limit: 5 }),
          getRejectedProducts(user, { page: 1, limit: 5 }),
        ]),
    )
  logInfo('admin-overview:after-promise-all', {
    domain: 'admin',
    route: '/admin',
    adminId: user.id,
    pendingSellerCount: pendingSellerQueue.items.length,
    pendingProductCount: pendingProductQueue.items.length,
    suspendedSellerCount: suspendedSellerQueue.items.length,
    rejectedProductCount: rejectedProductQueue.items.length,
  })

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
  logInfo('admin-users:data:before-service', {
    domain: 'admin-users',
    route: '/admin/users',
    adminId: user.id,
    page: filters.page,
    limit: filters.limit,
  })
  const data = await measureServerOperation(
    'getAdminUsersPageData',
    {
      route: '/admin/users',
      component: 'app/(protected)/admin/_lib/admin-dashboard.data',
      adminId: user.id,
      page: filters.page,
      limit: filters.limit,
      role: filters.role ?? null,
      hasSearch: Boolean(filters.search?.trim()),
    },
    () => getAllUsers(user, filters),
  )
  logInfo('admin-users:data:after-service', {
    domain: 'admin-users',
    route: '/admin/users',
    adminId: user.id,
    itemCount: data.items.length,
    total: data.total,
  })

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

export async function getAdminReviewsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(adminReviewListQuerySchema, searchParams)
  const data = await getAdminReviews(user, filters)

  return {
    filters,
    ...data,
  }
}
