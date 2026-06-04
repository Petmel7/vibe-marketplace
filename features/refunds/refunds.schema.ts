import { RefundRequestReason, RefundRequestStatus } from '@/app/generated/prisma/client'
import { z } from 'zod'

const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid monetary amount')

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const createRefundRequestSchema = z
  .object({
    orderId: z.string().uuid(),
    orderItemId: z.string().uuid(),
    amount: moneyStringSchema,
    reason: z.nativeEnum(RefundRequestReason),
    description: z.string().trim().max(4000).nullish(),
  })
  .superRefine((input, ctx) => {
    if (input.reason === RefundRequestReason.OTHER && !input.description?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Description is required when reason is OTHER',
      })
    }
  })

export const refundListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(RefundRequestStatus).optional(),
})

export const sellerRefundListQuerySchema = refundListQuerySchema.extend({
  storeId: z.string().uuid().optional(),
})

export const adminRefundListQuerySchema = refundListQuerySchema.extend({
  reason: z.nativeEnum(RefundRequestReason).optional(),
  requestedById: z.string().uuid().optional(),
  resolvedById: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})

export const updateAdminRefundStatusSchema = z.object({
  status: z.nativeEnum(RefundRequestStatus),
  adminNote: z.string().trim().max(4000).nullish(),
})

export const adminRefundMutationNoteSchema = z.object({
  adminNote: z.string().trim().max(4000).nullish(),
})

export type RefundListQueryInput = z.infer<typeof refundListQuerySchema>
export type SellerRefundListQueryInput = z.infer<typeof sellerRefundListQuerySchema>
export type AdminRefundListQueryInput = z.infer<typeof adminRefundListQuerySchema>
