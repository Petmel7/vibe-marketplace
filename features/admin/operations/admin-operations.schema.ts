import { z } from 'zod'
import {
  jobListQuerySchema,
  jobRunnerRequestSchema,
  recoverStaleJobsRequestSchema,
} from '@/features/jobs/jobs.schema'
import {
  defaultedQueryNumber,
  optionalQueryDate,
  optionalQueryString,
  optionalQueryUuid,
} from '@/lib/validation/query'

export const adminOperationsJobsQuerySchema = jobListQuerySchema

export const adminOperationsRunDueSchema = jobRunnerRequestSchema.extend({
  limit: z.number().int().min(1).max(25).default(10),
})

export const adminOperationsRecoverStaleSchema = recoverStaleJobsRequestSchema.extend({
  limit: z.number().int().min(1).max(100).default(25),
})

export const adminAuditLogQuerySchema = z.object({
  page: defaultedQueryNumber(z.coerce.number().int().min(1), 1),
  limit: defaultedQueryNumber(z.coerce.number().int().min(1).max(100), 20),
  actorId: optionalQueryUuid(),
  domain: optionalQueryString(z.string().trim().min(1).max(100)),
  action: optionalQueryString(z.string().trim().min(1).max(100)),
  resourceType: optionalQueryString(z.string().trim().min(1).max(100)),
  resourceId: optionalQueryString(z.string().trim().min(1).max(255)),
  dateFrom: optionalQueryDate(),
  dateTo: optionalQueryDate(),
})
