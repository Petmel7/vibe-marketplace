import { z } from 'zod'

const uuidSchema = z.uuid('Invalid UUID')

export const reportEvidenceRouteParamsSchema = z.object({
  id: uuidSchema,
})

export const reportEvidenceItemRouteParamsSchema = z.object({
  id: uuidSchema,
  evidenceId: uuidSchema,
})

export type ReportEvidenceRouteParams = z.infer<typeof reportEvidenceRouteParamsSchema>
export type ReportEvidenceItemRouteParams = z.infer<typeof reportEvidenceItemRouteParamsSchema>
