import type { JobStatus, JobType } from '@/app/generated/prisma/client'

export const JOB_TYPES = [
  'SEND_EMAIL',
  'RECALCULATE_PRODUCT_METRICS',
  'RECALCULATE_RISK_PROFILE',
  'SYNC_SHIPMENT_STATUS',
  'RELEASE_SELLER_FUNDS',
  'REFRESH_ANALYTICS',
  'PROCESS_NOTIFICATION_DIGEST',
] as const

export const JOB_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const

export type KnownJobType = (typeof JOB_TYPES)[number]
export type KnownJobStatus = (typeof JOB_STATUSES)[number]

export type SendEmailJobPayload = {
  emailEventId: string
}

export type RecalculateProductMetricsJobPayload = {
  productId?: string | null
}

export type RecalculateRiskProfileJobPayload = {
  userId?: string | null
  storeId?: string | null
}

export type SyncShipmentStatusJobPayload = {
  shipmentId?: string | null
  limit?: number
}

export type ReleaseSellerFundsJobPayload = {
  storeId?: string | null
  sellerId?: string | null
}

export type RefreshAnalyticsJobPayload = {
  scope?: 'admin' | 'seller' | 'all'
  storeId?: string | null
}

export type ProcessNotificationDigestJobPayload = {
  userId?: string | null
}

export type JobPayloadMap = {
  SEND_EMAIL: SendEmailJobPayload
  RECALCULATE_PRODUCT_METRICS: RecalculateProductMetricsJobPayload
  RECALCULATE_RISK_PROFILE: RecalculateRiskProfileJobPayload
  SYNC_SHIPMENT_STATUS: SyncShipmentStatusJobPayload
  RELEASE_SELLER_FUNDS: ReleaseSellerFundsJobPayload
  REFRESH_ANALYTICS: RefreshAnalyticsJobPayload
  PROCESS_NOTIFICATION_DIGEST: ProcessNotificationDigestJobPayload
}

export type JobPayload = JobPayloadMap[KnownJobType]

export type EnqueueJobInputDto<TType extends KnownJobType = KnownJobType> = {
  type: TType
  payload: JobPayloadMap[TType]
  dedupeKey?: string | null
  runAt?: string | Date | null
  maxAttempts?: number
}

export type JobDto = {
  id: string
  type: JobType
  payload: JobPayload
  status: JobStatus
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

export type JobProcessResultDto = {
  job: JobDto
  handled: boolean
  skipped: boolean
  result: Record<string, unknown> | null
}

export type JobRunnerRequestDto = {
  limit: number
}

export type JobRunnerResponseDto = {
  processed: number
  succeeded: number
  failed: number
  recovered: number
  items: JobProcessResultDto[]
}

export type RecoverStaleJobsResultDto = {
  recoveredCount: number
  recoveredJobIds: string[]
}

export type JobListQueryDto = {
  page: number
  limit: number
  status?: KnownJobStatus
  type?: KnownJobType
  dateFrom?: string
  dateTo?: string
}

export type JobListDto = {
  items: JobDto[]
  page: number
  limit: number
  total: number
}

export type JobDefinition<TType extends KnownJobType = KnownJobType> = {
  type: TType
  maxAttempts?: number
  run: (payload: JobPayloadMap[TType]) => Promise<Record<string, unknown> | void>
}

export type JobsRegistry = {
  [Type in KnownJobType]: JobDefinition<Type>
}
