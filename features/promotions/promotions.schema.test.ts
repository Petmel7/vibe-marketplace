import { describe, expect, it } from 'vitest'
import {
  createPromotionSchema,
  updatePromotionSchema,
} from '@/features/promotions/promotions.schema'

const validCreateInput = {
  code: 'SAVE10',
  name: 'Save 10',
  description: 'Marketplace launch coupon',
  type: 'COUPON_CODE',
  discountType: 'PERCENTAGE',
  discountValue: '10.00',
  minOrderAmount: '100.00',
  maxDiscountAmount: '50.00',
  usageLimit: 100,
  usageLimitPerUser: 1,
  startsAt: '2026-06-03T10:00:00.000Z',
  endsAt: '2026-06-30T10:00:00.000Z',
  isActive: true,
} as const

describe('promotion schemas', () => {
  it('accepts a valid create promotion payload', () => {
    const result = createPromotionSchema.safeParse(validCreateInput)

    expect(result.success).toBe(true)
  })

  it('accepts partial update fields', () => {
    const result = updatePromotionSchema.safeParse({
      name: 'Updated summer coupon',
      isActive: false,
    })

    expect(result.success).toBe(true)
  })

  it('rejects an empty update payload', () => {
    const result = updatePromotionSchema.safeParse({})

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('At least one promotion field must be provided')
  })

  it('rejects an invalid date range on create', () => {
    const result = createPromotionSchema.safeParse({
      ...validCreateInput,
      endsAt: '2026-06-01T10:00:00.000Z',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.some((issue) => issue.message === 'End date must be later than start date')).toBe(true)
  })

  it('rejects invalid discount values', () => {
    const createResult = createPromotionSchema.safeParse({
      ...validCreateInput,
      discountValue: '0.00',
    })
    const updateResult = updatePromotionSchema.safeParse({
      discountType: 'PERCENTAGE',
      discountValue: '150.00',
    })

    expect(createResult.success).toBe(false)
    expect(createResult.error?.issues.some((issue) => issue.message === 'Discount value must be greater than zero')).toBe(true)
    expect(updateResult.success).toBe(false)
    expect(updateResult.error?.issues.some((issue) => issue.message === 'Percentage discount cannot exceed 100')).toBe(true)
  })
})
