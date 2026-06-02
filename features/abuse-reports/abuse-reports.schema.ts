import { z } from 'zod'
import {
  AbuseReportActionType,
  AbuseReportReason,
  AbuseReportStatus,
  AbuseReportTargetType,
} from '@/app/generated/prisma/client'

const uuidSchema = z.uuid('Invalid UUID')
const dateStringSchema = z.iso.datetime('Invalid date')

export const reportIdParamSchema = z.object({
  id: uuidSchema,
})

export const createAbuseReportSchema = z
  .object({
    targetType: z.enum(AbuseReportTargetType),
    targetId: uuidSchema,
    reason: z.enum(AbuseReportReason),
    description: z
      .string()
      .trim()
      .max(2000, 'Description must be at most 2000 characters')
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reason === AbuseReportReason.OTHER && !value.description?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Description is required when reason is OTHER',
      })
    }
  })

export const myReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(AbuseReportStatus).optional(),
})

export const adminReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(AbuseReportStatus).optional(),
  targetType: z.enum(AbuseReportTargetType).optional(),
  reason: z.enum(AbuseReportReason).optional(),
  assignedAdminId: uuidSchema.optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
})

export const updateAbuseReportStatusSchema = z
  .object({
    status: z.enum(AbuseReportStatus),
    assignedAdminId: uuidSchema.nullish(),
    resolutionNote: z
      .string()
      .trim()
      .max(2000, 'Resolution note must be at most 2000 characters')
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.status === AbuseReportStatus.RESOLVED ||
        value.status === AbuseReportStatus.DISMISSED) &&
      !value.resolutionNote?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resolutionNote'],
        message: 'Resolution note is required when resolving or dismissing a report',
      })
    }
  })

export const createAbuseReportActionSchema = z.object({
  actionType: z.enum(AbuseReportActionType),
  note: z
    .string()
    .trim()
    .max(2000, 'Action note must be at most 2000 characters')
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateAbuseReportInput = z.infer<typeof createAbuseReportSchema>
export type MyReportsQuery = z.infer<typeof myReportsQuerySchema>
export type AdminReportsQuery = z.infer<typeof adminReportsQuerySchema>
export type UpdateAbuseReportStatusInput = z.infer<typeof updateAbuseReportStatusSchema>
export type CreateAbuseReportActionInput = z.infer<typeof createAbuseReportActionSchema>
