import {
  PromotionDiscountType,
  PromotionType,
} from '@/app/generated/prisma/client'
import { z } from 'zod'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid monetary amount')

const optionalMoneyStringSchema = moneyStringSchema.nullish()

const isoDateTimeSchema = z.string().datetime({ offset: true })

const promotionCodeSchema = z
  .string()
  .trim()
  .min(1, 'Promotion code is required')
  .max(64, 'Promotion code must be 64 characters or fewer')

export const createPromotionBaseSchema = z.object({
  code: promotionCodeSchema,
  name: z.string().trim().min(1, 'Promotion name is required').max(255),
  description: z.string().trim().max(2000).nullish(),
  type: z.nativeEnum(PromotionType),
  discountType: z.nativeEnum(PromotionDiscountType),
  discountValue: moneyStringSchema,
  minOrderAmount: optionalMoneyStringSchema,
  maxDiscountAmount: optionalMoneyStringSchema,
  usageLimit: z.coerce.number().int().min(1).nullish(),
  usageLimitPerUser: z.coerce.number().int().min(1).nullish(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.nullish(),
  isActive: z.boolean().optional(),
})

export const promotionQuerySchema = paginationSchema.extend({
  type: z.nativeEnum(PromotionType).optional(),
  isActive: z.coerce.boolean().optional(),
  code: z.string().trim().max(64).optional(),
})

type PromotionValidationInput = {
  discountType?: PromotionDiscountType
  discountValue?: string | null
  minOrderAmount?: string | null
  maxDiscountAmount?: string | null
  startsAt?: string | null
  endsAt?: string | null
}

function applyPromotionValidationRules(
  input: PromotionValidationInput,
  ctx: z.RefinementCtx,
) {
  const discountValue =
    typeof input.discountValue === 'string' ? Number.parseFloat(input.discountValue) : null
  const minOrderAmount =
    typeof input.minOrderAmount === 'string' ? Number.parseFloat(input.minOrderAmount) : null
  const maxDiscountAmount =
    typeof input.maxDiscountAmount === 'string' ? Number.parseFloat(input.maxDiscountAmount) : null

  if (discountValue != null && (!Number.isFinite(discountValue) || discountValue <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountValue'],
      message: 'Discount value must be greater than zero',
    })
  }

  if (
    input.discountType === PromotionDiscountType.PERCENTAGE &&
    discountValue != null &&
    discountValue > 100
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountValue'],
      message: 'Percentage discount cannot exceed 100',
    })
  }

  if (minOrderAmount != null && minOrderAmount < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minOrderAmount'],
      message: 'Minimum order amount cannot be negative',
    })
  }

  if (maxDiscountAmount != null && maxDiscountAmount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxDiscountAmount'],
      message: 'Maximum discount amount must be greater than zero',
    })
  }

  if (input.startsAt && input.endsAt) {
    const startsAt = new Date(input.startsAt)
    const endsAt = new Date(input.endsAt)
    if (endsAt <= startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'End date must be later than start date',
      })
    }
  }
}

export const createPromotionSchema = createPromotionBaseSchema.superRefine((input, ctx) => {
  applyPromotionValidationRules(input, ctx)
})

export const updatePromotionBaseSchema = createPromotionBaseSchema.partial()

export const updatePromotionSchema = updatePromotionBaseSchema.superRefine((input, ctx) => {
  if (Object.keys(input).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one promotion field must be provided',
    })
  }

  applyPromotionValidationRules(input, ctx)
  })

export const updatePromotionStatusSchema = z.object({
  isActive: z.boolean(),
})

export const applyCheckoutPromotionSchema = z.object({
  cartId: z.string().uuid().optional(),
  couponCode: promotionCodeSchema,
})
