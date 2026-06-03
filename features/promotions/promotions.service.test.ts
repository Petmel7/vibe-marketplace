import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/promotions/promotions.repository', () => ({
  countPromotionUsages: vi.fn(),
  countPromotionUsagesByUser: vi.fn(),
  countPromotions: vi.fn(),
  createPromotion: vi.fn(),
  deletePromotion: vi.fn(),
  findPromotionByCode: vi.fn(),
  findPromotionById: vi.fn(),
  listAutomaticPromotions: vi.fn(),
  listPromotions: vi.fn(),
  updatePromotion: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}))

import * as repo from '@/features/promotions/promotions.repository'
import * as guards from '@/lib/auth/guards'
import {
  buildCheckoutPromotionPreview,
  createAdminPromotion,
  deleteAdminPromotion,
  resolvePromotionForCheckout,
} from '@/features/promotions/promotions.service'
import {
  InvalidPromotionCodeError,
  PromotionExpiredError,
  PromotionInactiveError,
  PromotionMinimumAmountError,
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

function makePromotion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'promo-1',
    code: 'SAVE10',
    name: 'Save 10',
    description: null,
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
  mockRepo.countPromotionUsages.mockResolvedValue(0)
  mockRepo.countPromotionUsagesByUser.mockResolvedValue(0)
})

describe('resolvePromotionForCheckout', () => {
  it('calculates percentage coupon discounts', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(makePromotion() as never)

    const result = await resolvePromotionForCheckout({
      userId: 'buyer-1',
      subtotal: new Decimal('200.00'),
      couponCode: 'save10',
      now: new Date('2026-06-03T10:00:00.000Z'),
    })

    expect(result?.discountAmount).toBe('20.00')
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
      subtotal: new Decimal('99.98'),
      couponCode: 'fixed15',
      now: new Date('2026-06-03T10:00:00.000Z'),
    })

    expect(result?.discountAmount).toBe('15.00')
  })

  it('enforces minimum order amount', async () => {
    mockRepo.findPromotionByCode.mockResolvedValue(
      makePromotion({
        minOrderAmount: { toString: () => '150.00' },
      }) as never,
    )

    await expect(
      resolvePromotionForCheckout({
        userId: 'buyer-1',
        subtotal: new Decimal('99.98'),
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
        subtotal: new Decimal('99.98'),
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
        subtotal: new Decimal('99.98'),
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
        subtotal: new Decimal('99.98'),
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
        subtotal: new Decimal('99.98'),
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
        subtotal: new Decimal('99.98'),
        couponCode: 'missing',
        now: new Date('2026-06-03T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(InvalidPromotionCodeError)
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

describe('buildCheckoutPromotionPreview', () => {
  it('returns a stable checkout promotion preview DTO', () => {
    const result = buildCheckoutPromotionPreview({
      cartId: 'cart-1',
      subtotal: new Decimal('120.00'),
      appliedPromotion: {
        id: 'promo-1',
        code: 'SAVE10',
        name: 'Save 10',
        type: 'COUPON_CODE',
        discountType: 'PERCENTAGE',
        discountValue: '10.00',
        discountAmount: '12.00',
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
        type: 'COUPON_CODE',
        discountType: 'PERCENTAGE',
        discountValue: '10.00',
        discountAmount: '12.00',
      },
    })
  })
})
