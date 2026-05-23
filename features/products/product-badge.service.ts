import Decimal from 'decimal.js'
import {
  ProductBadgeSource,
  ProductBadgeType,
  ProductStatus,
  UserRole,
  type ProductBadge,
  type ProductBadgeRule,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  CreateAdminProductBadgeDto,
  ProductBadgeDto,
  ProductBadgeListDto,
  ProductMetricsDto,
  ProductMetricsListDto,
} from './product-badge.dto'
import type { ProductBadgesQuery, ProductMetricsQuery } from './product-badge.schema'
import { findBadgeRuleByType } from './product-badge-rule.repository'
import {
  aggregateReviewStats,
  aggregateSalesStats,
  aggregateViewCounts,
  aggregateWishlistCounts,
  countBadgeSubjectProducts,
  createAdminProductBadge as repoCreateAdminProductBadge,
  deleteProductBadge as repoDeleteProductBadge,
  findActiveBadgeConflict,
  findActiveProductBadges,
  findAllProductBadges,
  findBadgeSubjectProducts,
  findProductBadgeById,
  findProductByIdForBadgeMutation,
  findProductMetrics,
  replaceSystemHitBadges,
  replaceSystemNewBadge,
  upsertProductMetrics,
} from './product-badge.repository'
import {
  InvalidBadgeTransitionError,
  ProductBadgeConflictError,
  ProductMetricsCalculationError,
  UnauthorizedBadgeMutationError,
} from '@/lib/errors/product'
import { ProductNotFoundError } from '@/lib/errors/seller'

const NEW_BADGE_WINDOW_DAYS = 30

type BadgeFlagSubject = {
  id: string
  status: ProductStatus
  publishedAt: Date | null
  isActive: boolean
}

function toProductBadgeDto(badge: ProductBadge): ProductBadgeDto {
  return {
    id: badge.id,
    productId: badge.productId,
    type: badge.type,
    source: badge.source,
    score: badge.score ? badge.score.toString() : null,
    startsAt: badge.startsAt?.toISOString() ?? null,
    endsAt: badge.endsAt?.toISOString() ?? null,
    createdAt: badge.createdAt.toISOString(),
    updatedAt: badge.updatedAt.toISOString(),
  }
}

function toProductMetricsDto(metric: {
  productId: string
  viewCount: number
  wishlistCount: number
  soldCount: number
  revenueAmount: { toString(): string }
  ratingAvg: { toString(): string }
  reviewCount: number
  hitScore: { toString(): string }
  lastCalculatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): ProductMetricsDto {
  return {
    productId: metric.productId,
    viewCount: metric.viewCount,
    wishlistCount: metric.wishlistCount,
    soldCount: metric.soldCount,
    revenueAmount: metric.revenueAmount.toString(),
    ratingAvg: metric.ratingAvg.toString(),
    reviewCount: metric.reviewCount,
    hitScore: metric.hitScore.toString(),
    lastCalculatedAt: metric.lastCalculatedAt?.toISOString() ?? null,
    createdAt: metric.createdAt.toISOString(),
    updatedAt: metric.updatedAt.toISOString(),
  }
}

function buildDerivedNewBadge(product: BadgeFlagSubject): ProductBadgeDto | null {
  if (
    !product.isActive ||
    product.status !== ProductStatus.PUBLISHED ||
    !product.publishedAt
  ) {
    return null
  }

  const startsAt = product.publishedAt
  const endsAt = new Date(startsAt.getTime() + NEW_BADGE_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  if (endsAt <= new Date()) {
    return null
  }

  return {
    id: `system-new:${product.id}`,
    productId: product.id,
    type: ProductBadgeType.NEW,
    source: ProductBadgeSource.SYSTEM,
    score: null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    createdAt: startsAt.toISOString(),
    updatedAt: startsAt.toISOString(),
  }
}

function productHasActiveSystemNewBadge(badges: ProductBadgeDto[]) {
  return badges.some((badge) => badge.type === ProductBadgeType.NEW && badge.source === ProductBadgeSource.SYSTEM)
}

function hasPositiveRuleThreshold(rule: ProductBadgeRule) {
  return (
    rule.minViews > 0 ||
    rule.minWishlists > 0 ||
    rule.minSoldCount > 0 ||
    new Decimal(rule.minRevenueAmount).greaterThan(0)
  )
}

function qualifiesForHitRule(
  rule: ProductBadgeRule | null,
  metrics: {
    viewCount: number
    wishlistCount: number
    soldCount: number
    revenueAmount: Decimal
  },
) {
  if (!rule || !rule.enabled || !hasPositiveRuleThreshold(rule)) {
    return false
  }

  return (
    (rule.minViews > 0 && metrics.viewCount >= rule.minViews) ||
    (rule.minWishlists > 0 && metrics.wishlistCount >= rule.minWishlists) ||
    (rule.minSoldCount > 0 && metrics.soldCount >= rule.minSoldCount) ||
    (new Decimal(rule.minRevenueAmount).greaterThan(0) &&
      metrics.revenueAmount.greaterThanOrEqualTo(rule.minRevenueAmount))
  )
}

export function calculateHitScore(metrics: {
  viewCount: number
  wishlistCount: number
  soldCount: number
  revenueAmount: Decimal
  ratingAvg: Decimal
  reviewCount: number
}) {
  return new Decimal(metrics.soldCount)
    .mul(5)
    .plus(new Decimal(metrics.revenueAmount).mul(0.1))
    .plus(new Decimal(metrics.wishlistCount).mul(2))
    .plus(new Decimal(metrics.viewCount).mul(0.1))
    .plus(new Decimal(metrics.ratingAvg).mul(3))
    .plus(new Decimal(metrics.reviewCount))
    .toDecimalPlaces(4)
}

export async function syncSystemNewBadgeForProduct(product: BadgeFlagSubject): Promise<void> {
  const shouldPersist =
    product.isActive &&
    product.status === ProductStatus.PUBLISHED &&
    product.publishedAt !== null

  await replaceSystemNewBadge(product.id, product.publishedAt, shouldPersist)
}

export async function resolveMarketplaceBadgesForProducts(products: BadgeFlagSubject[]) {
  const productIds = products.map((product) => product.id)
  const now = new Date()
  const activeBadges = await findActiveProductBadges(
    productIds,
    now,
    [ProductBadgeType.NEW, ProductBadgeType.HIT, ProductBadgeType.FEATURED],
  )
  const badgesByProductId = new Map<string, ProductBadgeDto[]>()

  for (const badge of activeBadges) {
    const bucket = badgesByProductId.get(badge.productId) ?? []
    bucket.push(toProductBadgeDto(badge))
    badgesByProductId.set(badge.productId, bucket)
  }

  return new Map(
    products.map((product) => {
      const badges = badgesByProductId.get(product.id) ?? []
      const derivedNewBadge = buildDerivedNewBadge(product)

      if (derivedNewBadge && !productHasActiveSystemNewBadge(badges)) {
        badges.push(derivedNewBadge)
      }

      return [product.id, badges]
    }),
  )
}

export async function resolveMarketplaceFlagsForProducts(products: BadgeFlagSubject[]) {
  const badgesByProductId = await resolveMarketplaceBadgesForProducts(products)

  return new Map(
    products.map((product) => {
      const badges = badgesByProductId.get(product.id) ?? []
      const badgeTypes = new Set(badges.map((badge) => badge.type))

      return [
        product.id,
        {
          isNew: badgeTypes.has(ProductBadgeType.NEW),
          isHit: badgeTypes.has(ProductBadgeType.HIT),
        },
      ]
    }),
  )
}

export async function recalculateProductMetricsAndBadges(): Promise<void> {
  try {
    const products = await findBadgeSubjectProducts()
    const productIds = products.map((product) => product.id)
    const [viewCounts, wishlistCounts, reviewStats, salesStats, hitRule] = await Promise.all([
      aggregateViewCounts(productIds),
      aggregateWishlistCounts(productIds),
      aggregateReviewStats(productIds),
      aggregateSalesStats(productIds),
      findBadgeRuleByType(ProductBadgeType.HIT),
    ])

    const calculatedAt = new Date()
    const snapshots = products.map((product) => {
      const revenueAmount = salesStats.get(product.id)?.revenueAmount ?? new Decimal(0)
      const ratingAvg = reviewStats.get(product.id)?.ratingAvg ?? new Decimal(0)

      const snapshot = {
        productId: product.id,
        viewCount: viewCounts.get(product.id) ?? 0,
        wishlistCount: wishlistCounts.get(product.id) ?? 0,
        soldCount: salesStats.get(product.id)?.soldCount ?? 0,
        revenueAmount,
        ratingAvg,
        reviewCount: reviewStats.get(product.id)?.reviewCount ?? 0,
      }

      return {
        ...snapshot,
        hitScore: calculateHitScore(snapshot),
        calculatedAt,
      }
    })

    await upsertProductMetrics(snapshots)

    const productsById = new Map(products.map((product) => [product.id, product]))

    const systemHitBadges = snapshots
      .filter((snapshot) => {
        const product = productsById.get(snapshot.productId)
        if (!product) {
          return false
        }

        if (!product.isActive || product.status !== ProductStatus.PUBLISHED) {
          return false
        }

        return qualifiesForHitRule(hitRule, snapshot)
      })
      .map((snapshot) => ({
        productId: snapshot.productId,
        score: snapshot.hitScore,
      }))

    await replaceSystemHitBadges(systemHitBadges)
  } catch (error) {
    throw new ProductMetricsCalculationError(
      error instanceof Error ? error.message : 'Product metrics could not be calculated',
    )
  }
}

export async function getProductBadges(query: ProductBadgesQuery): Promise<ProductBadgeListDto> {
  if (!query.productId && query.type === ProductBadgeType.HIT) {
    await recalculateProductMetricsAndBadges()
  }

  const products = await findBadgeSubjectProducts({
    productIds: query.productId ? [query.productId] : undefined,
    page: query.productId ? undefined : query.page,
    limit: query.productId ? undefined : query.limit,
  })

  const total = query.productId
    ? products.length
    : await countBadgeSubjectProducts()

  if (products.length === 0) {
    return {
      items: [],
      total: 0,
      page: query.page,
      totalPages: 0,
    }
  }

  const productIds = products.map((product) => product.id)
  const persisted = await findAllProductBadges({
    productIds,
    type: query.type,
    page: 1,
    limit: Math.max(productIds.length * 6, query.limit),
    activeOnly: query.activeOnly,
    now: new Date(),
  })

  const items = persisted.items.map(toProductBadgeDto)
  const productById = new Map(products.map((product) => [product.id, product]))
  const byProductId = new Map<string, ProductBadgeDto[]>()

  for (const badge of items) {
    const bucket = byProductId.get(badge.productId) ?? []
    bucket.push(badge)
    byProductId.set(badge.productId, bucket)
  }

  for (const product of products) {
    if (query.type && query.type !== ProductBadgeType.NEW) {
      continue
    }

    const derived = buildDerivedNewBadge(product)
    if (!derived) {
      continue
    }

    const current = byProductId.get(product.id) ?? []
    if (!productHasActiveSystemNewBadge(current)) {
      items.push(derived)
    }
  }

  const filteredItems = items
    .filter((badge) => {
      const product = productById.get(badge.productId)
      if (!product) {
        return false
      }

      return product.isActive && product.status === ProductStatus.PUBLISHED
    })
    .filter((badge) => !query.type || badge.type === query.type)
    .sort((left, right) => left.productId.localeCompare(right.productId) || right.createdAt.localeCompare(left.createdAt))

  return {
    items: filteredItems,
    total: query.productId ? filteredItems.length : total,
    page: query.page,
    totalPages: query.productId ? (filteredItems.length > 0 ? 1 : 0) : (total === 0 ? 0 : Math.ceil(total / query.limit)),
  }
}

export async function getProductMetrics(query: ProductMetricsQuery): Promise<ProductMetricsListDto> {
  await recalculateProductMetricsAndBadges()

  const { items, total } = await findProductMetrics({
    productId: query.productId,
    page: query.page,
    limit: query.limit,
  })

  return {
    items: items.map(toProductMetricsDto),
    total,
    page: query.page,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
  }
}

export async function createAdminBadgeOverride(
  admin: SessionUser,
  productId: string,
  data: CreateAdminProductBadgeDto,
): Promise<ProductBadgeDto> {
  if (!admin.roles.includes(UserRole.ADMIN)) {
    throw new UnauthorizedBadgeMutationError()
  }

  const product = await findProductByIdForBadgeMutation(productId)
  if (!product) {
    throw new ProductNotFoundError()
  }

  if (!product.isActive || product.status !== ProductStatus.PUBLISHED) {
    throw new InvalidBadgeTransitionError('Only active published products can receive marketplace badge overrides')
  }

  const conflict = await findActiveBadgeConflict({
    productId,
    type: data.type,
    source: ProductBadgeSource.ADMIN,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
  })

  if (conflict) {
    throw new ProductBadgeConflictError()
  }

  const created = await repoCreateAdminProductBadge({
    productId,
    type: data.type,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
    score: data.score ? new Decimal(data.score) : null,
  })

  return toProductBadgeDto(created)
}

export async function deleteAdminBadgeOverride(
  admin: SessionUser,
  productId: string,
  badgeId: string,
): Promise<void> {
  if (!admin.roles.includes(UserRole.ADMIN)) {
    throw new UnauthorizedBadgeMutationError()
  }

  const badge = await findProductBadgeById(productId, badgeId)
  if (!badge) {
    throw new ProductNotFoundError('Product badge not found')
  }

  if (badge.source !== ProductBadgeSource.ADMIN) {
    throw new InvalidBadgeTransitionError('System-managed badges cannot be deleted manually')
  }

  await repoDeleteProductBadge(badgeId)
}
