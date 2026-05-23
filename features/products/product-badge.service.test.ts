import { beforeEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'
import { ProductBadgeSource, ProductBadgeType, ProductStatus, UserRole } from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  calculateHitScore,
  createAdminBadgeOverride,
  getProductBadges,
  recalculateProductMetricsAndBadges,
  resolveMarketplaceBadgesForProducts,
  syncSystemNewBadgeForProduct,
} from './product-badge.service'
import * as repository from './product-badge.repository'
import * as badgeRuleRepository from './product-badge-rule.repository'
import {
  InvalidBadgeTransitionError,
  ProductBadgeConflictError,
  UnauthorizedBadgeMutationError,
} from '@/lib/errors/product'

vi.mock('./product-badge.repository', () => ({
  aggregateReviewStats: vi.fn(),
  aggregateSalesStats: vi.fn(),
  aggregateViewCounts: vi.fn(),
  aggregateWishlistCounts: vi.fn(),
  countBadgeSubjectProducts: vi.fn(),
  createAdminProductBadge: vi.fn(),
  deleteProductBadge: vi.fn(),
  findActiveBadgeConflict: vi.fn(),
  findActiveProductBadges: vi.fn(),
  findAllProductBadges: vi.fn(),
  findBadgeSubjectProducts: vi.fn(),
  findProductBadgeById: vi.fn(),
  findProductByIdForBadgeMutation: vi.fn(),
  findProductMetrics: vi.fn(),
  replaceSystemHitBadges: vi.fn(),
  replaceSystemNewBadge: vi.fn(),
  upsertProductMetrics: vi.fn(),
}))

vi.mock('./product-badge-rule.repository', () => ({
  findBadgeRuleByType: vi.fn(),
}))

const mockedRepository = vi.mocked(repository)
const mockedBadgeRuleRepository = vi.mocked(badgeRuleRepository)

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
}

function makeBadgeProduct(overrides: Partial<repository.BadgeSubjectProduct> = {}): repository.BadgeSubjectProduct {
  return {
    id: 'product-1',
    categoryId: 'cat-1',
    ownerId: 'seller-1',
    status: ProductStatus.PUBLISHED,
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    isActive: true,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedRepository.countBadgeSubjectProducts.mockResolvedValue(1)
  mockedRepository.findAllProductBadges.mockResolvedValue({ items: [], total: 0 })
  mockedBadgeRuleRepository.findBadgeRuleByType.mockResolvedValue({
    id: 'rule-hit',
    badgeType: ProductBadgeType.HIT,
    minViews: 3,
    minWishlists: 2,
    minSoldCount: 1,
    minRevenueAmount: new Decimal(0),
    enabled: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedBy: 'admin-1',
  } as never)
})

describe('calculateHitScore', () => {
  it('calculates a deterministic weighted hit score', () => {
    const score = calculateHitScore({
      viewCount: 100,
      wishlistCount: 5,
      soldCount: 3,
      revenueAmount: new Decimal('250.00'),
      ratingAvg: new Decimal('4.50'),
      reviewCount: 8,
    })

    expect(score.toFixed(4)).toBe('81.5000')
  })
})

describe('getProductBadges', () => {
  it('resolves a system NEW badge from publishedAt even when no row exists yet', async () => {
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([makeBadgeProduct()])

    const result = await getProductBadges({
      productId: 'product-1',
      type: ProductBadgeType.NEW,
      activeOnly: true,
      page: 1,
      limit: 20,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      productId: 'product-1',
      type: ProductBadgeType.NEW,
      source: ProductBadgeSource.SYSTEM,
    })
  })

  it('does not expose an active NEW badge for rejected products', async () => {
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([
      makeBadgeProduct({ status: ProductStatus.REJECTED }),
    ])

    const result = await getProductBadges({
      productId: 'product-1',
      type: ProductBadgeType.NEW,
      activeOnly: true,
      page: 1,
      limit: 20,
    })

    expect(result.items).toEqual([])
  })
})

describe('syncSystemNewBadgeForProduct', () => {
  it('persists a SYSTEM NEW badge window for active published products', async () => {
    const publishedAt = new Date('2026-05-20T10:00:00.000Z')

    await syncSystemNewBadgeForProduct(
      makeBadgeProduct({
        publishedAt,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      }),
    )

    expect(mockedRepository.replaceSystemNewBadge).toHaveBeenCalledWith(
      'product-1',
      publishedAt,
      true,
    )
  })

  it('removes SYSTEM NEW persistence for draft products', async () => {
    await syncSystemNewBadgeForProduct(
      makeBadgeProduct({
        status: ProductStatus.DRAFT,
        publishedAt: null,
      }),
    )

    expect(mockedRepository.replaceSystemNewBadge).toHaveBeenCalledWith(
      'product-1',
      null,
      false,
    )
  })
})

describe('resolveMarketplaceBadgesForProducts', () => {
  it('does not return NEW badges for products older than the 30-day window', async () => {
    mockedRepository.findActiveProductBadges.mockResolvedValue([])

    const result = await resolveMarketplaceBadgesForProducts([
      makeBadgeProduct({
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ])

    expect(result.get('product-1')).toEqual([])
  })

  it('does not return NEW badges for inactive or rejected products', async () => {
    mockedRepository.findActiveProductBadges.mockResolvedValue([])

    const result = await resolveMarketplaceBadgesForProducts([
      makeBadgeProduct({ isActive: false }),
      makeBadgeProduct({ id: 'product-2', status: ProductStatus.REJECTED }),
    ])

    expect(result.get('product-1')).toEqual([])
    expect(result.get('product-2')).toEqual([])
  })
})

describe('recalculateProductMetricsAndBadges', () => {
  it('aggregates metrics, persists them, and syncs system hit badges', async () => {
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([
      makeBadgeProduct({ id: 'product-hit' }),
      makeBadgeProduct({ id: 'product-idle', publishedAt: null }),
      makeBadgeProduct({ id: 'product-draft', status: ProductStatus.DRAFT }),
    ])
    mockedRepository.aggregateViewCounts.mockResolvedValue(
      new Map([
        ['product-hit', 120],
        ['product-idle', 5],
      ]),
    )
    mockedRepository.aggregateWishlistCounts.mockResolvedValue(
      new Map([
        ['product-hit', 10],
        ['product-idle', 1],
      ]),
    )
    mockedRepository.aggregateReviewStats.mockResolvedValue(
      new Map([
        ['product-hit', { reviewCount: 6, ratingAvg: new Decimal('4.80') }],
      ]),
    )
    mockedRepository.aggregateSalesStats.mockResolvedValue(
      new Map([
        ['product-hit', { soldCount: 20, revenueAmount: new Decimal('2000.00') }],
      ]),
    )

    await recalculateProductMetricsAndBadges()

    expect(mockedRepository.upsertProductMetrics).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          productId: 'product-hit',
          soldCount: 20,
          viewCount: 120,
          wishlistCount: 10,
          reviewCount: 6,
          revenueAmount: new Decimal('2000.00'),
        }),
      ]),
    )
    expect(mockedRepository.replaceSystemHitBadges).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          productId: 'product-hit',
          score: expect.any(Decimal),
        }),
      ]),
    )

    const hitBadgesCall = mockedRepository.replaceSystemHitBadges.mock.calls[0]?.[0] ?? []
    expect(hitBadgesCall.some((badge) => badge.productId === 'product-draft')).toBe(false)
  })

  it('assigns HIT when trusted views satisfy the active rule threshold', async () => {
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([
      makeBadgeProduct({ id: 'product-views-hit' }),
    ])
    mockedRepository.aggregateViewCounts.mockResolvedValue(new Map([['product-views-hit', 3]]))
    mockedRepository.aggregateWishlistCounts.mockResolvedValue(new Map([['product-views-hit', 0]]))
    mockedRepository.aggregateReviewStats.mockResolvedValue(new Map())
    mockedRepository.aggregateSalesStats.mockResolvedValue(new Map())

    await recalculateProductMetricsAndBadges()

    expect(mockedRepository.replaceSystemHitBadges).toHaveBeenCalledWith([
      expect.objectContaining({ productId: 'product-views-hit' }),
    ])
  })

  it('assigns HIT when trusted wishlist count satisfies the active rule threshold', async () => {
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([
      makeBadgeProduct({ id: 'product-wishlist-hit' }),
    ])
    mockedRepository.aggregateViewCounts.mockResolvedValue(new Map([['product-wishlist-hit', 0]]))
    mockedRepository.aggregateWishlistCounts.mockResolvedValue(new Map([['product-wishlist-hit', 2]]))
    mockedRepository.aggregateReviewStats.mockResolvedValue(new Map())
    mockedRepository.aggregateSalesStats.mockResolvedValue(new Map())

    await recalculateProductMetricsAndBadges()

    expect(mockedRepository.replaceSystemHitBadges).toHaveBeenCalledWith([
      expect.objectContaining({ productId: 'product-wishlist-hit' }),
    ])
  })

  it('assigns HIT when trusted sold count satisfies the active rule threshold', async () => {
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([
      makeBadgeProduct({ id: 'product-sales-hit' }),
    ])
    mockedRepository.aggregateViewCounts.mockResolvedValue(new Map([['product-sales-hit', 0]]))
    mockedRepository.aggregateWishlistCounts.mockResolvedValue(new Map([['product-sales-hit', 0]]))
    mockedRepository.aggregateReviewStats.mockResolvedValue(new Map())
    mockedRepository.aggregateSalesStats.mockResolvedValue(
      new Map([['product-sales-hit', { soldCount: 1, revenueAmount: new Decimal('49.99') }]]),
    )

    await recalculateProductMetricsAndBadges()

    expect(mockedRepository.replaceSystemHitBadges).toHaveBeenCalledWith([
      expect.objectContaining({ productId: 'product-sales-hit' }),
    ])
  })

  it('does not assign HIT below all active thresholds', async () => {
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([
      makeBadgeProduct({ id: 'product-below-thresholds' }),
    ])
    mockedRepository.aggregateViewCounts.mockResolvedValue(new Map([['product-below-thresholds', 2]]))
    mockedRepository.aggregateWishlistCounts.mockResolvedValue(new Map([['product-below-thresholds', 1]]))
    mockedRepository.aggregateReviewStats.mockResolvedValue(new Map())
    mockedRepository.aggregateSalesStats.mockResolvedValue(
      new Map([['product-below-thresholds', { soldCount: 0, revenueAmount: new Decimal('0') }]]),
    )

    await recalculateProductMetricsAndBadges()

    const hitBadgesCall = mockedRepository.replaceSystemHitBadges.mock.calls[0]?.[0] ?? []
    expect(hitBadgesCall).toEqual([])
  })

  it('does not award HIT when seller-owned wishlist and views are excluded from trusted metrics', async () => {
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([
      makeBadgeProduct({ id: 'product-owner-only' }),
    ])
    mockedRepository.aggregateViewCounts.mockResolvedValue(new Map([['product-owner-only', 0]]))
    mockedRepository.aggregateWishlistCounts.mockResolvedValue(new Map([['product-owner-only', 0]]))
    mockedRepository.aggregateReviewStats.mockResolvedValue(
      new Map([['product-owner-only', { reviewCount: 0, ratingAvg: new Decimal(0) }]]),
    )
    mockedRepository.aggregateSalesStats.mockResolvedValue(
      new Map([['product-owner-only', { soldCount: 0, revenueAmount: new Decimal(0) }]]),
    )

    await recalculateProductMetricsAndBadges()

    const hitBadgesCall = mockedRepository.replaceSystemHitBadges.mock.calls[0]?.[0] ?? []
    expect(hitBadgesCall).toEqual([])
  })

  it('allows trusted buyer wishlist and views to contribute to HIT metrics', async () => {
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([
      makeBadgeProduct({ id: 'product-buyer-signal' }),
    ])
    mockedRepository.aggregateViewCounts.mockResolvedValue(new Map([['product-buyer-signal', 80]]))
    mockedRepository.aggregateWishlistCounts.mockResolvedValue(new Map([['product-buyer-signal', 7]]))
    mockedRepository.aggregateReviewStats.mockResolvedValue(
      new Map([['product-buyer-signal', { reviewCount: 3, ratingAvg: new Decimal('4.50') }]]),
    )
    mockedRepository.aggregateSalesStats.mockResolvedValue(
      new Map([['product-buyer-signal', { soldCount: 4, revenueAmount: new Decimal('320.00') }]]),
    )

    await recalculateProductMetricsAndBadges()

    expect(mockedRepository.upsertProductMetrics).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          productId: 'product-buyer-signal',
          viewCount: 80,
          wishlistCount: 7,
          soldCount: 4,
        }),
      ]),
    )

    const hitBadgesCall = mockedRepository.replaceSystemHitBadges.mock.calls[0]?.[0] ?? []
    expect(hitBadgesCall).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: 'product-buyer-signal',
          score: expect.any(Decimal),
        }),
      ]),
    )
  })

  it('removes SYSTEM HIT badges when the active rule is disabled', async () => {
    mockedBadgeRuleRepository.findBadgeRuleByType.mockResolvedValue({
      id: 'rule-hit',
      badgeType: ProductBadgeType.HIT,
      minViews: 3,
      minWishlists: 2,
      minSoldCount: 1,
      minRevenueAmount: new Decimal(0),
      enabled: false,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedBy: 'admin-1',
    } as never)
    mockedRepository.findBadgeSubjectProducts.mockResolvedValue([
      makeBadgeProduct({ id: 'product-hit-disabled' }),
    ])
    mockedRepository.aggregateViewCounts.mockResolvedValue(new Map([['product-hit-disabled', 30]]))
    mockedRepository.aggregateWishlistCounts.mockResolvedValue(new Map([['product-hit-disabled', 10]]))
    mockedRepository.aggregateReviewStats.mockResolvedValue(new Map())
    mockedRepository.aggregateSalesStats.mockResolvedValue(
      new Map([['product-hit-disabled', { soldCount: 5, revenueAmount: new Decimal('500.00') }]]),
    )

    await recalculateProductMetricsAndBadges()

    expect(mockedRepository.replaceSystemHitBadges).toHaveBeenCalledWith([])
  })
})

describe('createAdminBadgeOverride', () => {
  it('allows admins to create manual badge overrides', async () => {
    mockedRepository.findProductByIdForBadgeMutation.mockResolvedValue({
      id: 'product-1',
      status: ProductStatus.PUBLISHED,
      isActive: true,
      publishedAt: new Date('2026-05-01T00:00:00.000Z'),
    })
    mockedRepository.findActiveBadgeConflict.mockResolvedValue(null)
    mockedRepository.createAdminProductBadge.mockResolvedValue({
      id: 'badge-1',
      productId: 'product-1',
      type: ProductBadgeType.FEATURED,
      source: ProductBadgeSource.ADMIN,
      score: null,
      startsAt: null,
      endsAt: null,
      createdAt: new Date('2026-05-21T00:00:00.000Z'),
      updatedAt: new Date('2026-05-21T00:00:00.000Z'),
    })

    const result = await createAdminBadgeOverride(adminUser, 'product-1', {
      type: ProductBadgeType.FEATURED,
      score: null,
      startsAt: null,
      endsAt: null,
    })

    expect(result.type).toBe(ProductBadgeType.FEATURED)
    expect(result.source).toBe(ProductBadgeSource.ADMIN)
  })

  it('rejects badge creation by non-admin users', async () => {
    await expect(
      createAdminBadgeOverride(
        {
          id: 'seller-1',
          email: 'seller@example.com',
          roles: [UserRole.SELLER],
        },
        'product-1',
        { type: ProductBadgeType.HIT },
      ),
    ).rejects.toThrow(UnauthorizedBadgeMutationError)
  })

  it('rejects overlapping admin badge overrides', async () => {
    mockedRepository.findProductByIdForBadgeMutation.mockResolvedValue({
      id: 'product-1',
      status: ProductStatus.PUBLISHED,
      isActive: true,
      publishedAt: new Date('2026-05-01T00:00:00.000Z'),
    })
    mockedRepository.findActiveBadgeConflict.mockResolvedValue({
      id: 'badge-existing',
      productId: 'product-1',
      type: ProductBadgeType.HIT,
      source: ProductBadgeSource.ADMIN,
      score: null,
      startsAt: null,
      endsAt: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    })

    await expect(
      createAdminBadgeOverride(adminUser, 'product-1', { type: ProductBadgeType.HIT }),
    ).rejects.toThrow(ProductBadgeConflictError)
  })

  it('rejects hit overrides for non-published products', async () => {
    mockedRepository.findProductByIdForBadgeMutation.mockResolvedValue({
      id: 'product-1',
      status: ProductStatus.DRAFT,
      isActive: true,
      publishedAt: null,
    })

    await expect(
      createAdminBadgeOverride(adminUser, 'product-1', { type: ProductBadgeType.HIT }),
    ).rejects.toThrow(InvalidBadgeTransitionError)
  })
})
