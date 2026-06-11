import { z } from 'zod'
import { JOB_STATUSES, JOB_TYPES } from './jobs.dto'

const jobTypeSchema = z.enum(JOB_TYPES)

const sendEmailJobPayloadSchema = z.object({
  emailEventId: z.uuid(),
})

const recalculateProductMetricsJobPayloadSchema = z.object({
  productId: z.uuid().nullable().optional(),
})

const recalculateRiskProfileJobPayloadSchema = z
  .object({
    userId: z.uuid().nullable().optional(),
    storeId: z.uuid().nullable().optional(),
  })
  .refine((value) => Boolean(value.userId || value.storeId), {
    message: 'Risk profile jobs require userId or storeId',
    path: ['userId'],
  })

const syncShipmentStatusJobPayloadSchema = z.object({
  shipmentId: z.uuid().nullable().optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

const releaseSellerFundsJobPayloadSchema = z
  .object({
    storeId: z.uuid().nullable().optional(),
    sellerId: z.uuid().nullable().optional(),
  })
  .refine((value) => Boolean(value.storeId || value.sellerId), {
    message: 'Seller funds jobs require storeId or sellerId',
    path: ['storeId'],
  })

const refreshAnalyticsJobPayloadSchema = z.object({
  scope: z.enum(['admin', 'seller', 'all']).optional(),
  storeId: z.uuid().nullable().optional(),
})

const processNotificationDigestJobPayloadSchema = z.object({
  userId: z.uuid().nullable().optional(),
})

export const jobPayloadSchemaByType = {
  SEND_EMAIL: sendEmailJobPayloadSchema,
  RECALCULATE_PRODUCT_METRICS: recalculateProductMetricsJobPayloadSchema,
  RECALCULATE_RISK_PROFILE: recalculateRiskProfileJobPayloadSchema,
  SYNC_SHIPMENT_STATUS: syncShipmentStatusJobPayloadSchema,
  RELEASE_SELLER_FUNDS: releaseSellerFundsJobPayloadSchema,
  REFRESH_ANALYTICS: refreshAnalyticsJobPayloadSchema,
  PROCESS_NOTIFICATION_DIGEST: processNotificationDigestJobPayloadSchema,
} as const

export const enqueueJobSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SEND_EMAIL'),
    payload: sendEmailJobPayloadSchema,
    dedupeKey: z.string().trim().min(1).max(255).nullable().optional(),
    runAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
    maxAttempts: z.number().int().min(1).max(25).optional(),
  }),
  z.object({
    type: z.literal('RECALCULATE_PRODUCT_METRICS'),
    payload: recalculateProductMetricsJobPayloadSchema,
    dedupeKey: z.string().trim().min(1).max(255).nullable().optional(),
    runAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
    maxAttempts: z.number().int().min(1).max(25).optional(),
  }),
  z.object({
    type: z.literal('RECALCULATE_RISK_PROFILE'),
    payload: recalculateRiskProfileJobPayloadSchema,
    dedupeKey: z.string().trim().min(1).max(255).nullable().optional(),
    runAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
    maxAttempts: z.number().int().min(1).max(25).optional(),
  }),
  z.object({
    type: z.literal('SYNC_SHIPMENT_STATUS'),
    payload: syncShipmentStatusJobPayloadSchema,
    dedupeKey: z.string().trim().min(1).max(255).nullable().optional(),
    runAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
    maxAttempts: z.number().int().min(1).max(25).optional(),
  }),
  z.object({
    type: z.literal('RELEASE_SELLER_FUNDS'),
    payload: releaseSellerFundsJobPayloadSchema,
    dedupeKey: z.string().trim().min(1).max(255).nullable().optional(),
    runAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
    maxAttempts: z.number().int().min(1).max(25).optional(),
  }),
  z.object({
    type: z.literal('REFRESH_ANALYTICS'),
    payload: refreshAnalyticsJobPayloadSchema,
    dedupeKey: z.string().trim().min(1).max(255).nullable().optional(),
    runAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
    maxAttempts: z.number().int().min(1).max(25).optional(),
  }),
  z.object({
    type: z.literal('PROCESS_NOTIFICATION_DIGEST'),
    payload: processNotificationDigestJobPayloadSchema,
    dedupeKey: z.string().trim().min(1).max(255).nullable().optional(),
    runAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
    maxAttempts: z.number().int().min(1).max(25).optional(),
  }),
])

export const jobRunnerRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
})

export const recoverStaleJobsRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
})

export const jobRunnerHeaderSchema = z.object({
  authorization: z.string().optional(),
  'x-job-runner-secret': z.string().optional(),
})

export const jobIdSchema = z.uuid()
export const jobTypeFilterSchema = jobTypeSchema
export const jobStatusFilterSchema = z.enum(JOB_STATUSES)

export const jobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: jobStatusFilterSchema.optional(),
  type: jobTypeFilterSchema.optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})
