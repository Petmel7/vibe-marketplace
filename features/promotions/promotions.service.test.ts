import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/promotions/promotions.repository', () => ({
  countPromotionUsages: vi.fn(),
  countPromotionUsagesByUser: vi.fn(),
  countPromotions: vi.fn(),
  countSellerPromotions: vi.fn(),
  createPromotion: vi.fn(),
  deletePromotion: vi.fn(),
  findOwnedProductsInStoreByIds: vi.fn(),
  findOwnedStoreById: vi.fn(),
  findPromotionByCode: vi.fn(),
  findPromotionById: vi.fn(),
  findSellerPromotionById: vi.fn(),
  findStoreProductCategoryIds: vi.fn(),
  listAutomaticPromotions: vi.fn(),
  listActiveVisiblePromotionsForProductDisplay: vi.fn(),
  listPromotions: vi.fn(),
  listSellerPromotions: vi.fn(),
  replacePromotionTargets: vi.fn(),
  updatePromotion: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
  requireSeller: vi.fn(),
}))

import * as repo from '@/features/promotions/promotions.repository'
import * as guards from '@/lib/auth/guards'
import {
  buildCheckoutPromotionPreview,
  createAdminPromotion,
  createSellerPromotion,
  deleteAdminPromotion,
  getSellerPromotionById,
  getVisibleProductPromotions,
  resolvePromotionForCheckout,
} from '@/features/promotions/promotions.service'
import {
  InvalidPromotionCodeError,
  InvalidPromotionTargetError,
  PromotionExpiredError,
  PromotionInactiveError,
  PromotionMinimumAmountError,
  PromotionNotFoundError,
  PromotionUsageLimitReachedError,
  PromotionUserLimitReachedError,
} from '@/lib/errors/promotion'
import type { SessionUser } from '@/features/auth/auth.dto'
import Decimal from 'decimal.js'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(guards)

const adminUser: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

const sellerUser: SessionUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'seller@example.com',
  roles: ['SELLER'],
}

function makePromotion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'promo-1',
    code: 'SAVE10',
    name: 'Save 10',
    description: null,
    ownerType: 'MARKETPLACE',
    storeId: null,
    type: 'COUPON_CODE',
    discountType: 'PERCENTAGE',
    discountValue: { toString: () => '10.00' },
    minOrderAmount: null,
    maxDiscountAmount: null,
    usageLimit: null,
    usageLimitPerUser: null,
    startsAt: new Date('2026-06-01T00:00:00.000Z'),
    endsAt: new Date('2026-06-30T23:59:59.000Z'),
    isActive: true,
    createdById: adminUser.id,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    store: null,
    targets: [],
    _count: {
      usages: 0,
      orderPromotions: 0,
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.requireAdmin.mockReturnValue(undefined)
  mockGuards.requireSeller.mockReturnValue(undefined)
  mockRepo.countPromotionUsages.mockResolvedValue(0)
  mockRepo.countPromotionUsagesByUser.mockResolvedValue(0)
  mockRepo.findOwnedStoreById.mockResolvedValue({
    id: 'store-1',
    name: 'Seller Store',
    ownerId: sellerUser.id,
  } as never)
  mockRepo.findOwnedProductsInStoreByIds.mockResolvedValue([])
  mockRepo.findStoreProductCategoryIds.mockResolvedValue([])
})

describe('resolvePromotionForCheckout', () => {
  const items = [
    {
      storeId: 'store-1',
      productId: 'product-1',
      categoryId: 'category-1',
      lineTotal: new Decimal('100.00'),
    },
    {
      storeId: 'store-2',
      productId: 'product-2',
      categoryId: 'category-2',
      lineTotal: new Decimal('50.00'),
    },
  ]

  it('calculates marketplace percentage coupon discounts', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(makePromotion() as never)

    const result = await resolvePromotionForCheckout({
      userId: 'buyer-1',
      items,
      couponCode: 'save10',
      now: new Date('2026-06-03T10:00:00.000Z'),
    })

    expect(result?.discountAmount).toBe('15.00')
    expect(result?.eligibleSubtotal).toBe('150.00')
    expect(mockRepo.findPromotionByCode).toHaveBeenCalledWith('SAVE10')
  })

  it('calculates fixed coupon discounts', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(
      makePromotion({
        discountType: 'FIXED_AMOUNT',
        discountValue: { toString: () => '15.00' },
      }) as never,
    )

    const result = await resolvePromotionForCheckout({
      userId: 'buyer-1',
      items,
      couponCode: 'fixed15',
      now: new Date('2026-06-03T10:00:00.000Z'),
    })

    expect(result?.discountAmount).toBe('15.00')
  })

  it('enforces minimum order amount', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(
      makePromotion({
        minOrderAmount: { toString: () => '200.00' },
      }) as never,
    )

    await expect(
      resolvePromotionForCheckout({
        userId: 'buyer-1',
        items,
        couponCode: 'save10',
        now: new Date('2026-06-03T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(PromotionMinimumAmountError)
  })

  it('rejects expired coupons', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(
      makePromotion({
        endsAt: new Date('2026-06-02T00:00:00.000Z'),
      }) as never,
    )

    await expect(
      resolvePromotionForCheckout({
        userId: 'buyer-1',
        items,
        couponCode: 'save10',
        now: new Date('2026-06-03T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(PromotionExpiredError)
  })

  it('rejects inactive coupons', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(
      makePromotion({
        isActive: false,
      }) as never,
    )

    await expect(
      resolvePromotionForCheckout({
        userId: 'buyer-1',
        items,
        couponCode: 'save10',
        now: new Date('2026-06-03T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(PromotionInactiveError)
  })

  it('rejects when total usage limit is reached', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(
      makePromotion({
        usageLimit: 1,
      }) as never,
    )
    mockRepo.countPromotionUsages.mockResolvedValueOnce(1)

    await expect(
      resolvePromotionForCheckout({
        userId: 'buyer-1',
        items,
        couponCode: 'save10',
        now: new Date('2026-06-03T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(PromotionUsageLimitReachedError)
  })

  it('rejects when per-user usage limit is reached', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(
      makePromotion({
        usageLimitPerUser: 1,
      }) as never,
    )
    mockRepo.countPromotionUsagesByUser.mockResolvedValueOnce(1)

    await expect(
      resolvePromotionForCheckout({
        userId: 'buyer-1',
        items,
        couponCode: 'save10',
        now: new Date('2026-06-03T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(PromotionUserLimitReachedError)
  })

  it('throws a safe error for invalid coupon codes', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(null)

    await expect(
      resolvePromotionForCheckout({
        userId: 'buyer-1',
        items,
        couponCode: 'missing',
        now: new Date('2026-06-03T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(InvalidPromotionCodeError)
  })

  it('applies seller product coupons only to eligible items', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(
      makePromotion({
        ownerType: 'SELLER',
        storeId: 'store-1',
        targets: [
          {
            id: 'target-1',
            targetType: 'PRODUCT',
            targetId: 'product-1',
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ],
      }) as never,
    )

    const result = await resolvePromotionForCheckout({
      userId: 'buyer-1',
      items,
      couponCode: 'save10',
      now: new Date('2026-06-03T10:00:00.000Z'),
    })

    expect(result?.discountAmount).toBe('10.00')
    expect(result?.eligibleSubtotal).toBe('100.00')
    expect(result?.ownerType).toBe('SELLER')
    expect(result?.storeId).toBe('store-1')
  })

  it('chooses the best automatic promotion across marketplace and seller scopes', async () => {
    mockRepo.listAutomaticPromotions.mockResolvedValue([
      makePromotion({
        id: 'promo-market',
        code: 'AUTO5',
        type: 'AUTOMATIC_DISCOUNT',
        discountValue: { toString: () => '5.00' },
      }),
      makePromotion({
        id: 'promo-seller',
        code: 'STORE20',
        ownerType: 'SELLER',
        storeId: 'store-1',
        type: 'AUTOMATIC_DISCOUNT',
        discountValue: { toString: () => '20.00' },
        targets: [
          {
            id: 'target-store-1',
            targetType: 'STORE',
            targetId: 'store-1',
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ],
      }),
    ] as never)

    const result = await resolvePromotionForCheckout({
      userId: 'buyer-1',
      items,
      now: new Date('2026-06-03T10:00:00.000Z'),
    })

    expect(result?.code).toBe('STORE20')
    expect(result?.discountAmount).toBe('20.00')
  })
})

describe('admin promotions', () => {
  it('normalizes coupon codes on create', async () => {
    mockRepo.createPromotion.mockResolvedValue(
      makePromotion({
        code: 'SAVE10',
      }) as never,
    )

    await createAdminPromotion(adminUser, {
      code: ' save10 ',
      name: 'Save 10',
      description: null,
      type: 'COUPON_CODE',
      discountType: 'PERCENTAGE',
      discountValue: '10.00',
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-06-30T23:59:59.000Z',
      isActive: true,
    })

    expect(mockRepo.createPromotion).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SAVE10',
        ownerType: 'MARKETPLACE',
        storeId: null,
      }),
    )
  })

  it('blocks deleting promotions that already have usage history', async () => {
    mockRepo.findPromotionById.mockResolvedValue(
      makePromotion({
        _count: {
          usages: 1,
          orderPromotions: 1,
        },
      }) as never,
    )

    await expect(deleteAdminPromotion(adminUser, 'promo-1')).rejects.toThrow(
      'already used in orders',
    )
    expect(mockRepo.deletePromotion).not.toHaveBeenCalled()
  })
})

describe('seller promotions', () => {
  it('creates a seller store coupon', async () => {
    mockRepo.createPromotion.mockResolvedValue(
      makePromotion({
        ownerType: 'SELLER',
        storeId: 'store-1',
        targets: [
          {
            id: 'target-store-1',
            targetType: 'STORE',
            targetId: 'store-1',
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ],
      }) as never,
    )

    const result = await createSellerPromotion(sellerUser, {
      code: 'store10',
      name: 'Store 10%',
      description: null,
      storeId: 'store-1',
      targets: [{ targetType: 'STORE', targetId: 'store-1' }],
      type: 'COUPON_CODE',
      discountType: 'PERCENTAGE',
      discountValue: '10.00',
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-06-30T23:59:59.000Z',
      isActive: true,
    })

    expect(mockRepo.createPromotion).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'SELLER',
        storeId: 'store-1',
        code: 'STORE10',
        targets: [{ targetType: 'STORE', targetId: 'store-1' }],
      }),
    )
    expect(result.storeId).toBe('store-1')
    expect(result.ownerType).toBe('SELLER')
  })

  it('creates a seller product coupon', async () => {
    mockRepo.findOwnedProductsInStoreByIds.mockResolvedValue([
      { id: 'product-1', categoryId: 'category-1' },
    ] as never)
    mockRepo.createPromotion.mockResolvedValue(
      makePromotion({
        ownerType: 'SELLER',
        storeId: 'store-1',
        targets: [
          {
            id: 'target-product-1',
            targetType: 'PRODUCT',
            targetId: 'product-1',
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ],
      }) as never,
    )

    const result = await createSellerPromotion(sellerUser, {
      code: 'shirt15',
      name: 'Shirt 15',
      description: null,
      storeId: 'store-1',
      targets: [{ targetType: 'PRODUCT', targetId: 'product-1' }],
      type: 'COUPON_CODE',
      discountType: 'FIXED_AMOUNT',
      discountValue: '15.00',
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-06-30T23:59:59.000Z',
      isActive: true,
    })

    expect(mockRepo.findOwnedProductsInStoreByIds).toHaveBeenCalledWith('store-1', ['product-1'])
    expect(result.targets[0]?.targetType).toBe('PRODUCT')
  })

  it('prevents sellers from targeting another store product', async () => {
    mockRepo.findOwnedProductsInStoreByIds.mockResolvedValue([] as never)

    await expect(
      createSellerPromotion(sellerUser, {
        code: 'bad15',
        name: 'Bad 15',
        description: null,
        storeId: 'store-1',
        targets: [{ targetType: 'PRODUCT', targetId: 'other-store-product' }],
        type: 'COUPON_CODE',
        discountType: 'FIXED_AMOUNT',
        discountValue: '15.00',
        startsAt: '2026-06-01T00:00:00.000Z',
        endsAt: '2026-06-30T23:59:59.000Z',
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(InvalidPromotionTargetError)
  })

  it('does not expose another seller promotion', async () => {
    mockRepo.findSellerPromotionById.mockResolvedValue(null)

    await expect(getSellerPromotionById(sellerUser, 'promo-foreign')).rejects.toBeInstanceOf(
      PromotionNotFoundError,
    )
  })
})

describe('buildCheckoutPromotionPreview', () => {
  it('returns a stable checkout promotion preview DTO', () => {
    const result = buildCheckoutPromotionPreview({
      cartId: 'cart-1',
      subtotal: new Decimal('120.00'),
      appliedPromotion: {
        id: 'promo-1',
        code: 'SAVE10',
        name: 'Save 10',
        ownerType: 'MARKETPLACE',
        storeId: null,
        type: 'COUPON_CODE',
        discountType: 'PERCENTAGE',
        discountValue: '10.00',
        discountAmount: '12.00',
        eligibleSubtotal: '120.00',
      },
    })

    expect(result).toEqual({
      cartId: 'cart-1',
      subtotal: '120.00',
      discountAmount: '12.00',
      total: '108.00',
      appliedPromotion: {
        id: 'promo-1',
        code: 'SAVE10',
        name: 'Save 10',
        ownerType: 'MARKETPLACE',
        storeId: null,
        type: 'COUPON_CODE',
        discountType: 'PERCENTAGE',
        discountValue: '10.00',
        discountAmount: '12.00',
      },
    })
  })
})

describe('getVisibleProductPromotions', () => {
  it('prefers a product-scoped seller coupon over broader promotions for the same product', async () => {
    mockRepo.listActiveVisiblePromotionsForProductDisplay.mockResolvedValue([
      makePromotion({
        id: 'promo-store',
        ownerType: 'SELLER',
        storeId: 'store-1',
        targets: [
          {
            id: 'target-store',
            targetType: 'STORE',
            targetId: 'store-1',
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ],
      }),
      makePromotion({
        id: 'promo-product',
        code: 'STORE10',
        ownerType: 'SELLER',
        storeId: 'store-1',
        targets: [
          {
            id: 'target-product',
            targetType: 'PRODUCT',
            targetId: 'product-1',
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ],
      }),
    ] as never)

    const result = await getVisibleProductPromotions({
      products: [
        {
          id: 'product-1',
          storeId: 'store-1',
          categoryId: 'category-1',
        },
      ],
      now: new Date('2026-06-03T10:00:00.000Z'),
    })

    expect(result.get('product-1')).toEqual({
      id: 'promo-product',
      name: 'Save 10',
      code: 'STORE10',
      ownerType: 'SELLER',
      storeId: 'store-1',
      type: 'COUPON_CODE',
      discountType: 'PERCENTAGE',
      discountValue: '10.00',
      endsAt: '2026-06-30T23:59:59.000Z',
      targetType: 'PRODUCT',
      targetId: 'product-1',
    })
      expect(mockRepo.listActiveVisiblePromotionsForProductDisplay).toHaveBeenCalledWith({
        now: new Date('2026-06-03T10:00:00.000Z'),
        productIds: ['product-1'],
        storeIds: ['store-1'],
        categoryIds: [],
      })
  })

  it('omits invalid non-uuid category ids from the batched promotion lookup', async () => {
    mockRepo.listActiveVisiblePromotionsForProductDisplay.mockResolvedValue([] as never)

    await getVisibleProductPromotions({
      products: [
        {
          id: 'product-1',
          storeId: 'store-1',
          categoryId: 'cat-leaf-mens-hoodies-sweatshirts',
        },
      ],
      now: new Date('2026-06-03T10:00:00.000Z'),
    })

    expect(mockRepo.listActiveVisiblePromotionsForProductDisplay).toHaveBeenCalledWith({
      now: new Date('2026-06-03T10:00:00.000Z'),
      productIds: ['product-1'],
      storeIds: ['store-1'],
      categoryIds: [],
    })
  })

  it('keeps valid uuid category ids for category-scoped promotion matching', async () => {
    const categoryId = '11111111-1111-4111-8111-111111111111'
    mockRepo.listActiveVisiblePromotionsForProductDisplay.mockResolvedValue([
      makePromotion({
        id: 'promo-category',
        ownerType: 'SELLER',
        storeId: 'store-1',
        targets: [
          {
            id: 'target-category',
            targetType: 'CATEGORY',
            targetId: categoryId,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ],
      }),
    ] as never)

    const result = await getVisibleProductPromotions({
      products: [
        {
          id: 'product-1',
          storeId: 'store-1',
          categoryId,
        },
      ],
      now: new Date('2026-06-03T10:00:00.000Z'),
    })

    expect(mockRepo.listActiveVisiblePromotionsForProductDisplay).toHaveBeenCalledWith({
      now: new Date('2026-06-03T10:00:00.000Z'),
      productIds: ['product-1'],
      storeIds: ['store-1'],
      categoryIds: [categoryId],
    })
    expect(result.get('product-1')?.targetType).toBe('CATEGORY')
    expect(result.get('product-1')?.targetId).toBe(categoryId)
  })
})
