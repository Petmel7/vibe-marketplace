import { ProfileNotFoundError, SellerProfileNotFoundError } from '@/lib/errors/profile'
import { ProductNotFoundError, StoreNotFoundError } from '@/lib/errors/seller'
import { getMyProfile } from '@/features/profile/profile.service'
import { getMySellerProfile } from '@/features/seller/seller.service'
import { getMyAnalytics } from '@/features/seller/analytics/seller-analytics.service'
import { getMyProducts, getMyProductById } from '@/features/seller/products/seller-product.service'
import { getMyOrderItems } from '@/features/seller/orders/seller-order.service'
import { getOnboardingStatus } from '@/features/storefront/storefront.service'
import { listReviews } from '@/features/review/review.service'
import type { SessionUser } from '@/types/auth'
import { getSellerOnboardingState } from '@/types/seller'
import { hasRole } from '@/lib/rbac/guards'

export async function getSellerLayoutData(user: SessionUser) {
  let sellerProfile = null
  let store = null

  const isSeller = hasRole(user, 'SELLER')

  if (isSeller) {
    try {
      sellerProfile = await getMySellerProfile(user)
    } catch (error) {
      if (!(error instanceof SellerProfileNotFoundError)) {
        throw error
      }
    }

    if (sellerProfile) {
      try {
        const onboardingStatus = await getOnboardingStatus(user)
        store = onboardingStatus.store
      } catch (error) {
        if (!(error instanceof StoreNotFoundError) && !(error instanceof SellerProfileNotFoundError)) {
          throw error
        }
      }
    }
  }

  return {
    user,
    sellerProfile,
    store,
  }
}

export function getSellerStorefrontState(data: {
  sellerProfile: { verificationStatus: string } | null
  store: unknown | null
}) {
  return getSellerOnboardingState(
    data.sellerProfile?.verificationStatus as Parameters<typeof getSellerOnboardingState>[0],
    data.store !== null,
  )
}

export function getSellerWorkspaceRedirect(data: {
  sellerProfile: { verificationStatus: string } | null
  store: unknown | null
}) {
  const state = getSellerStorefrontState(data)

  if (state === 'BUYER' || state === 'PENDING_VERIFICATION' || state === 'REJECTED' || state === 'SUSPENDED') {
    return '/seller/onboarding'
  }

  if (state === 'VERIFIED_NO_STORE') {
    return '/seller/store?setup=storefront'
  }

  return null
}

export function getSellerStorefrontRedirect(data: {
  sellerProfile: { verificationStatus: string } | null
  store: unknown | null
}) {
  const state = getSellerStorefrontState(data)

  if (state === 'BUYER' || state === 'PENDING_VERIFICATION' || state === 'REJECTED' || state === 'SUSPENDED') {
    return '/seller/onboarding'
  }

  return null
}

export async function getSellerOverviewData(user: SessionUser) {
  const layout = await getSellerLayoutData(user)

  if (!layout.store) {
    return {
      ...layout,
      analytics: null,
      productSummaries: [],
      orderItems: [],
      lowStockProducts: [],
      topProducts: [],
    }
  }

  const [analytics, productSummaries, orderItems] = await Promise.all([
    getMyAnalytics(user),
    getMyProducts(user, { page: 1, limit: 8 }),
    getMyOrderItems(user, { page: 1, limit: 8 }),
  ])

  const lowStockProducts = productSummaries.filter((product) => product.totalStock <= 5)

  return {
    ...layout,
    analytics,
    productSummaries,
    orderItems,
    lowStockProducts,
    topProducts: analytics.topProducts.slice(0, 5),
  }
}

export async function getSellerProductsPageData(
  user: SessionUser,
  filters: { status?: string; page?: number; limit?: number },
) {
  const layout = await getSellerLayoutData(user)

  if (!layout.store) {
    return {
      ...layout,
      products: [],
    }
  }

  const products = await getMyProducts(user, filters)

  return {
    ...layout,
    products,
  }
}

export async function getSellerProductEditorData(user: SessionUser, productId: string) {
  const layout = await getSellerLayoutData(user)

  if (!layout.store) {
    return {
      ...layout,
      product: null,
    }
  }

  try {
    const product = await getMyProductById(user, productId)

    return {
      ...layout,
      product,
    }
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return {
        ...layout,
        product: null,
      }
    }

    throw error
  }
}

export async function getSellerOrdersPageData(user: SessionUser) {
  const layout = await getSellerLayoutData(user)

  if (!layout.store) {
    return {
      ...layout,
      orderItems: [],
    }
  }

  const orderItems = await getMyOrderItems(user, { page: 1, limit: 20 })

  return {
    ...layout,
    orderItems,
  }
}

export async function getSellerReviewsPageData(user: SessionUser) {
  const layout = await getSellerLayoutData(user)

  if (!layout.store) {
    return {
      ...layout,
      reviews: [],
    }
  }

  const products = await getMyProducts(user, { page: 1, limit: 50 })
  const reviewLists = await Promise.all(
    products.map(async (product) => {
      const result = await listReviews(product.id, { page: 1, limit: 20 })
      return result.items
    }),
  )

  const reviews = reviewLists
    .flat()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  return {
    ...layout,
    reviews,
  }
}

export async function getSellerAnalyticsPageData(user: SessionUser) {
  const layout = await getSellerLayoutData(user)

  if (!layout.store) {
    return {
      ...layout,
      analytics: null,
      products: [],
      orderItems: [],
    }
  }

  const [analytics, products, orderItems] = await Promise.all([
    getMyAnalytics(user),
    getMyProducts(user, { page: 1, limit: 20 }),
    getMyOrderItems(user, { page: 1, limit: 20 }),
  ])

  return {
    ...layout,
    analytics,
    products,
    orderItems,
  }
}

export async function getSellerStorePageData(user: SessionUser) {
  return getSellerLayoutData(user)
}

export async function getSellerInventoryPageData(user: SessionUser) {
  const layout = await getSellerLayoutData(user)

  if (!layout.store) {
    return {
      ...layout,
      products: [],
    }
  }

  const products = await Promise.all(
    (await getMyProducts(user, { page: 1, limit: 50 })).map((product) => getMyProductById(user, product.id)),
  )

  return {
    ...layout,
    products,
  }
}

export async function getSellerOnboardingPageData(user: SessionUser) {
  const layout = await getSellerLayoutData(user)
  let profile = null

  try {
    profile = await getMyProfile(user)
  } catch (error) {
    if (!(error instanceof ProfileNotFoundError)) {
      throw error
    }
  }

  const moderationReason = layout.sellerProfile
    ? extractModerationReason(layout.sellerProfile)
    : null

  return {
    ...layout,
    profile,
    moderationReason,
    onboardingState: getSellerStorefrontState(layout),
  }
}

function extractModerationReason(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const maybeRecord = value as Record<string, unknown>
  const reason = maybeRecord.moderationReason ?? maybeRecord.rejectionReason

  return typeof reason === 'string' && reason.trim() ? reason : null
}
