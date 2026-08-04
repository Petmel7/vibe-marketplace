import { RefundRequestReason, RefundRequestStatus } from '@/app/generated/prisma/client'
import {
  defaultedQueryNumber,
  optionalQueryDate,
  optionalQueryParam,
  optionalQueryUuid,
} from '@/lib/validation/query'
import { z } from 'zod'

const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid monetary amount')

const paginationSchema = z.object({
  page: defaultedQueryNumber(z.coerce.number().int().min(1), 1),
  limit: defaultedQueryNumber(z.coerce.number().int().min(1).max(100), 20),
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
  status: optionalQueryParam(z.nativeEnum(RefundRequestStatus)),
})

export const sellerRefundListQuerySchema = refundListQuerySchema.extend({
  storeId: optionalQueryUuid(),
})

export const adminRefundListQuerySchema = refundListQuerySchema.extend({
  reason: optionalQueryParam(z.nativeEnum(RefundRequestReason)),
  requestedById: optionalQueryUuid(),
  resolvedById: optionalQueryUuid(),
  storeId: optionalQueryUuid(),
  dateFrom: optionalQueryDate(),
  dateTo: optionalQueryDate(),
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
