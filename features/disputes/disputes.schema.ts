import { z } from 'zod'
import {
  DisputePriority,
  DisputeReason,
  DisputeStatus,
} from '@/app/generated/prisma/client'
import {
  defaultedQueryNumber,
  optionalQueryParam,
} from '@/lib/validation/query'

const uuidSchema = z.uuid('Invalid UUID')
const dateStringSchema = z.iso.datetime('Invalid date')

export const disputeIdParamSchema = z.object({
  id: uuidSchema,
})

export const createDisputeSchema = z.object({
  orderId: uuidSchema,
  orderItemId: uuidSchema.optional(),
  reason: z.enum(DisputeReason),
  priority: z.enum(DisputePriority).default(DisputePriority.NORMAL),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(4000, 'Description must be at most 4000 characters'),
})

export const disputeListQuerySchema = z.object({
  page: defaultedQueryNumber(z.coerce.number().int().min(1), 1),
  limit: defaultedQueryNumber(z.coerce.number().int().min(1).max(100), 20),
  status: optionalQueryParam(z.enum(DisputeStatus)),
  scope: optionalQueryParam(z.enum(['buyer', 'seller'])),
})

export const adminDisputeListQuerySchema = disputeListQuerySchema.extend({
  reason: optionalQueryParam(z.enum(DisputeReason)),
  priority: optionalQueryParam(z.enum(DisputePriority)),
  storeId: optionalQueryParam(uuidSchema),
  dateFrom: optionalQueryParam(dateStringSchema),
  dateTo: optionalQueryParam(dateStringSchema),
})

export const createDisputeMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(5000, 'Message must be at most 5000 characters'),
  isInternal: z.boolean().optional().default(false),
})

export const updateDisputeStatusSchema = z.object({
  status: z.enum([
    DisputeStatus.OPEN,
    DisputeStatus.UNDER_REVIEW,
    DisputeStatus.WAITING_BUYER,
    DisputeStatus.WAITING_SELLER,
    DisputeStatus.ESCALATED,
  ]),
})

export const resolveDisputeSchema = z.object({
  status: z.enum([DisputeStatus.RESOLVED, DisputeStatus.REJECTED, DisputeStatus.CLOSED]),
  resolutionNote: z
    .string()
    .trim()
    .min(5, 'Resolution note must be at least 5 characters')
    .max(4000, 'Resolution note must be at most 4000 characters'),
})

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>
export type DisputeListQueryInput = z.infer<typeof disputeListQuerySchema>
export type AdminDisputeListQueryInput = z.infer<typeof adminDisputeListQuerySchema>
export type CreateDisputeMessageInput = z.infer<typeof createDisputeMessageSchema>
export type UpdateDisputeStatusInput = z.infer<typeof updateDisputeStatusSchema>
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>
