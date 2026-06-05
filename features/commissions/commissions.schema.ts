import { CommissionRuleScope } from '@/app/generated/prisma/client'
import { z } from 'zod'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const isoDateTimeSchema = z.string().datetime({ offset: true })

const decimalRateSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, 'Rate must be a valid decimal value')

const moneyStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid monetary value')

export const commissionRuleQuerySchema = paginationSchema.extend({
  scope: z.nativeEnum(CommissionRuleScope).optional(),
  isActive: z.coerce.boolean().optional(),
  storeId: z.string().uuid().optional(),
  categoryId: z.string().optional(),
})

export const createCommissionRuleBaseSchema = z.object({
  name: z.string().trim().min(1, 'Rule name is required').max(255),
  scope: z.nativeEnum(CommissionRuleScope),
  storeId: z.string().uuid().nullish(),
  categoryId: z.string().trim().min(1).nullish(),
  rate: decimalRateSchema,
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.nullish(),
  priority: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().optional(),
})

function applyCommissionRuleValidation(
  input: {
    scope?: CommissionRuleScope
    storeId?: string | null
    categoryId?: string | null
    rate?: string | null
    startsAt?: string | null
    endsAt?: string | null
  },
  ctx: z.RefinementCtx,
) {
  const rate = input.rate != null ? Number.parseFloat(input.rate) : null
  if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rate'],
      message: 'Rate must be between 0 and 1',
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

  if (!input.scope) {
    return
  }

  if (input.scope === CommissionRuleScope.GLOBAL) {
    if (input.storeId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['storeId'],
        message: 'Global commission rules cannot target a store',
      })
    }

    if (input.categoryId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryId'],
        message: 'Global commission rules cannot target a category',
      })
    }
  }

  if (input.scope === CommissionRuleScope.STORE) {
    if (!input.storeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['storeId'],
        message: 'Store commission rules require a store',
      })
    }

    if (input.categoryId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryId'],
        message: 'Store commission rules cannot target a category',
      })
    }
  }

  if (input.scope === CommissionRuleScope.CATEGORY) {
    if (input.storeId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['storeId'],
        message: 'Category commission rules cannot target a store',
      })
    }

    if (!input.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryId'],
        message: 'Category commission rules require a category',
      })
    }
  }
}

export const createCommissionRuleSchema = createCommissionRuleBaseSchema.superRefine((input, ctx) => {
  applyCommissionRuleValidation(input, ctx)
})

export const updateCommissionRuleBaseSchema = z.object({
  name: z.string().trim().min(1, 'Rule name is required').max(255).optional(),
  scope: z.nativeEnum(CommissionRuleScope).optional(),
  storeId: z.string().uuid().nullish(),
  categoryId: z.string().trim().min(1).nullish(),
  rate: decimalRateSchema.optional(),
  startsAt: isoDateTimeSchema.optional(),
  endsAt: isoDateTimeSchema.nullish(),
  priority: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const updateCommissionRuleSchema = updateCommissionRuleBaseSchema.superRefine((input, ctx) => {
  if (Object.keys(input).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one commission rule field must be provided',
    })
  }

  applyCommissionRuleValidation(input, ctx)
})

export const updateCommissionRuleStatusSchema = z.object({
  isActive: z.boolean(),
})

export const previewCommissionRuleSchema = z.object({
  storeId: z.string().uuid().nullish(),
  categoryId: z.string().trim().min(1).nullish(),
  grossAmount: moneyStringSchema,
  at: isoDateTimeSchema.nullish(),
})
