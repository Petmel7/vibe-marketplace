import { RiskLevel } from '@/app/generated/prisma/client'
import { z } from 'zod'

export const riskTargetIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const riskProfileQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  level: z.enum(RiskLevel).optional(),
  search: z.string().trim().min(1).max(100).optional(),
})

export const riskRecalculateSchema = z
  .object({
    targetType: z.enum(['ALL', 'USER', 'STORE']).default('ALL'),
    targetId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.targetType !== 'ALL' && !value.targetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetId'],
        message: 'targetId is required when recalculating a specific user or store',
      })
    }

    if (value.targetType === 'ALL' && value.targetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetId'],
        message: 'targetId must be omitted when recalculating all risk profiles',
      })
    }
  })

export type RiskProfileQueryInput = z.infer<typeof riskProfileQuerySchema>
export type RiskRecalculateInput = z.infer<typeof riskRecalculateSchema>
