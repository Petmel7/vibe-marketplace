import { z } from 'zod'

const MAX_ANALYTICS_RANGE_DAYS = 366
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidAnalyticsDate(value: string): boolean {
  if (DATE_ONLY_PATTERN.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.getTime())
  }

  return !Number.isNaN(new Date(value).getTime())
}

export const analyticsRangeSchema = z.enum(['7d', '30d', '90d', '12m', 'custom'])
export const analyticsIntervalSchema = z.enum(['day', 'week', 'month'])

export const analyticsQueryBaseSchema = z.object({
  range: analyticsRangeSchema.default('30d'),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  interval: analyticsIntervalSchema.optional(),
})

function refineAnalyticsQuery(
  query: z.infer<typeof analyticsQueryBaseSchema>,
  ctx: z.RefinementCtx,
): void {
  if (query.range === 'custom') {
    if (!query.from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from is required when range is custom',
        path: ['from'],
      })
    }

    if (!query.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'to is required when range is custom',
        path: ['to'],
      })
    }
  }

  if (query.from && !isValidAnalyticsDate(query.from)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'from must be a valid date',
      path: ['from'],
    })
  }

  if (query.to && !isValidAnalyticsDate(query.to)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'to must be a valid date',
      path: ['to'],
    })
  }

  if (!query.from || !query.to || !isValidAnalyticsDate(query.from) || !isValidAnalyticsDate(query.to)) {
    return
  }

  const from = DATE_ONLY_PATTERN.test(query.from)
    ? new Date(`${query.from}T00:00:00.000Z`)
    : new Date(query.from)
  const to = DATE_ONLY_PATTERN.test(query.to)
    ? new Date(`${query.to}T23:59:59.999Z`)
    : new Date(query.to)

  if (from.getTime() > to.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'from must be less than or equal to to',
      path: ['from'],
    })
  }

  const diffDays = Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1
  if (diffDays > MAX_ANALYTICS_RANGE_DAYS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Analytics range must not exceed ${MAX_ANALYTICS_RANGE_DAYS} days`,
      path: ['from'],
    })
  }
}

export const analyticsQuerySchema = analyticsQueryBaseSchema.superRefine(refineAnalyticsQuery)

export const sellerAnalyticsQueryBaseSchema = analyticsQueryBaseSchema.extend({
  storeId: z.uuid().optional(),
})

export const sellerAnalyticsQuerySchema = sellerAnalyticsQueryBaseSchema.superRefine(
  refineAnalyticsQuery,
)

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
export type SellerAnalyticsQuery = z.infer<typeof sellerAnalyticsQuerySchema>

export { MAX_ANALYTICS_RANGE_DAYS }
