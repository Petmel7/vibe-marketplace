import type { JobRunnerResponseDto, KnownJobStatus, KnownJobType } from '@/features/jobs/jobs.dto'

export type AdminOperationsJobQueryDto = {
  page: number
  limit: number
  status?: KnownJobStatus
  type?: KnownJobType
  dateFrom?: string
  dateTo?: string
}

export type AdminOperationsJobDto = {
  id: string
  type: KnownJobType
  status: KnownJobStatus
  attempts: number
  maxAttempts: number
  runAt: string
  lockedAt: string | null
  lockExpiresAt: string | null
  stale: boolean
  processedAt: string | null
  failedAt: string | null
  errorMessage: string | null
  dedupeKey: string | null
  createdAt: string
  updatedAt: string
}

export type AdminOperationsJobListDto = {
  items: AdminOperationsJobDto[]
  page: number
  limit: number
  total: number
}

export type AdminOperationsJobsOverviewDto = {
  failedTotal: number
  pendingTotal: number
}

export type AdminOperationsRunDueRequestDto = {
  limit: number
}

export type AdminOperationsRunDueResponseDto = JobRunnerResponseDto

export type AdminOperationsRecoverStaleRequestDto = {
  limit: number
}

export type AdminOperationsRecoverStaleResponseDto = {
  recoveredCount: number
  recoveredJobIds: string[]
}

export type AdminAuditLogQueryDto = {
  page: number
  limit: number
  actorId?: string
  domain?: string
  action?: string
  resourceType?: string
  resourceId?: string
  dateFrom?: string
  dateTo?: string
}

export type AdminAuditLogDto = {
  id: string
  actorId: string | null
  actorEmail: string | null
  actorRole: string | null
  domain: string
  action: string
  resourceType: string
  resourceId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type AdminAuditLogListDto = {
  items: AdminAuditLogDto[]
  page: number
  limit: number
  total: number
}
