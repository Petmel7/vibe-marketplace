import { z } from 'zod'
import {
  jobListQuerySchema,
  jobRunnerRequestSchema,
  recoverStaleJobsRequestSchema,
} from '@/features/jobs/jobs.schema'

export const adminOperationsJobsQuerySchema = jobListQuerySchema

export const adminOperationsRunDueSchema = jobRunnerRequestSchema.extend({
  limit: z.number().int().min(1).max(25).default(10),
})

export const adminOperationsRecoverStaleSchema = recoverStaleJobsRequestSchema.extend({
  limit: z.number().int().min(1).max(100).default(25),
})

export const adminAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  actorId: z.string().uuid().optional(),
  domain: z.string().trim().min(1).max(100).optional(),
  action: z.string().trim().min(1).max(100).optional(),
  resourceType: z.string().trim().min(1).max(100).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})
