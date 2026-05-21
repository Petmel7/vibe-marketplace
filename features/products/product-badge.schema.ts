import { z } from 'zod'

const queryPaginationSchema = z.object({
  page: z.coerce
    .number({ error: 'page must be a number' })
    .int({ error: 'page must be an integer' })
    .min(1, { error: 'page must be at least 1' })
    .default(1),
  limit: z.coerce
    .number({ error: 'limit must be a number' })
    .int({ error: 'limit must be an integer' })
    .min(1, { error: 'limit must be at least 1' })
    .max(100, { error: 'limit must not exceed 100' })
    .default(20),
})

const optionalBooleanFromQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return value
}, z.boolean().optional())

export const productBadgesQuerySchema = queryPaginationSchema.extend({
  productId: z.string().uuid({ error: 'productId must be a valid UUID' }).optional(),
  type: z.enum(['NEW', 'HIT', 'FEATURED']).optional(),
  activeOnly: optionalBooleanFromQuery.default(true),
})

export const productMetricsQuerySchema = queryPaginationSchema.extend({
  productId: z.string().uuid({ error: 'productId must be a valid UUID' }).optional(),
})

export const adminCreateProductBadgeSchema = z.object({
  type: z.enum(['HIT', 'FEATURED']),
  score: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, 'score must be a valid positive decimal')
    .nullable()
    .optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endsAt must be later than startsAt',
      path: ['endsAt'],
    })
  }
})

export const productIdParamSchema = z.object({
  id: z.string().uuid({ error: 'id must be a valid UUID' }),
})

export const badgeIdParamSchema = z.object({
  badgeId: z.string().uuid({ error: 'badgeId must be a valid UUID' }),
})

export type ProductBadgesQuery = z.infer<typeof productBadgesQuerySchema>
export type ProductMetricsQuery = z.infer<typeof productMetricsQuerySchema>
export type AdminCreateProductBadgeInput = z.infer<typeof adminCreateProductBadgeSchema>
