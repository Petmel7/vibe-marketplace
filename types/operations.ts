export const OPERATION_JOB_STATUSES = ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const
export const OPERATION_JOB_TYPES = [
  'SEND_EMAIL',
  'RECALCULATE_PRODUCT_METRICS',
  'RECALCULATE_RISK_PROFILE',
  'SYNC_SHIPMENT_STATUS',
  'RELEASE_SELLER_FUNDS',
  'REFRESH_ANALYTICS',
  'PROCESS_NOTIFICATION_DIGEST',
] as const

export type OperationJobStatus = (typeof OPERATION_JOB_STATUSES)[number]
export type OperationJobType = (typeof OPERATION_JOB_TYPES)[number]

export type HealthStatus = {
  status: 'ok'
  timestamp: string
  uptimeSeconds: number
}

export type DeepHealthStatus = {
  status: 'ok' | 'degraded'
  timestamp: string
  uptimeSeconds: number
  database: {
    ok: boolean
  }
  env: {
    ok: boolean
    issues: Array<{ path: string; message: string }>
  }
  providers: {
    resendConfigured: boolean
    liqpayConfigured: boolean
    novaPoshtaConfigured: boolean
  }
  featureFlags: {
    emailEnabled: boolean
    paymentsEnabled: boolean
    shippingEnabled: boolean
    jobsEnabled: boolean
  }
}

export type OperationsHealthSnapshot = {
  basic: HealthStatus
  deep: DeepHealthStatus
  lastCheckedAt: string
}

export type AdminOperationsJob = {
  id: string
  type: OperationJobType
  status: OperationJobStatus
  attempts: number
  maxAttempts: number
  runAt: string
  lockedAt: string | null
  processedAt: string | null
  failedAt: string | null
  errorMessage: string | null
  dedupeKey: string | null
  createdAt: string
  updatedAt: string
}

export type AdminOperationsJobListResponse = {
  items: AdminOperationsJob[]
  page: number
  limit: number
  total: number
}

export type AdminOperationsRunDueResponse = {
  processed: number
  succeeded: number
  failed: number
  items: Array<{
    job: AdminOperationsJob
    handled: boolean
    skipped: boolean
    result: Record<string, unknown> | null
  }>
}

export type AdminAuditLog = {
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

export type AdminAuditLogListResponse = {
  items: AdminAuditLog[]
  page: number
  limit: number
  total: number
}

function formatAuditActorRole(actorRole: string | null) {
  if (!actorRole) {
    return 'User'
  }

  return actorRole
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function shortenActorId(actorId: string | null) {
  if (!actorId) {
    return null
  }

  return actorId.slice(0, 8)
}

export function getAdminAuditActorLabel(item: Pick<AdminAuditLog, 'actorEmail' | 'actorRole' | 'actorId'>) {
  if (item.actorEmail) {
    return item.actorEmail
  }

  if (item.actorId) {
    return `${formatAuditActorRole(item.actorRole)} · ${shortenActorId(item.actorId)}`
  }

  return 'Unknown actor'
}

export type OperationsJobsFilters = {
  page: number
  limit: number
  status: string
  type: string
  dateFrom: string
  dateTo: string
}

export type OperationsAuditFilters = {
  page: number
  limit: number
  actorId: string
  domain: string
  action: string
  resourceType: string
  dateFrom: string
  dateTo: string
}

function getSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

function normalizePositiveInteger(value: string, fallback: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(Math.trunc(parsed), max)
}

export function normalizeOperationsJobsFilters(
  searchParams: Record<string, string | string[] | undefined>,
): OperationsJobsFilters {
  const status = getSingleValue(searchParams.status)
  const type = getSingleValue(searchParams.type)

  return {
    page: normalizePositiveInteger(getSingleValue(searchParams.page), 1, 10_000),
    limit: normalizePositiveInteger(getSingleValue(searchParams.limit), 20, 100),
    status: OPERATION_JOB_STATUSES.includes(status as OperationJobStatus) ? status : '',
    type: OPERATION_JOB_TYPES.includes(type as OperationJobType) ? type : '',
    dateFrom: getSingleValue(searchParams.dateFrom).trim(),
    dateTo: getSingleValue(searchParams.dateTo).trim(),
  }
}

export function normalizeOperationsAuditFilters(
  searchParams: Record<string, string | string[] | undefined>,
): OperationsAuditFilters {
  return {
    page: normalizePositiveInteger(getSingleValue(searchParams.page), 1, 10_000),
    limit: normalizePositiveInteger(getSingleValue(searchParams.limit), 20, 100),
    actorId: getSingleValue(searchParams.actorId).trim(),
    domain: getSingleValue(searchParams.domain).trim(),
    action: getSingleValue(searchParams.action).trim(),
    resourceType: getSingleValue(searchParams.resourceType).trim(),
    dateFrom: getSingleValue(searchParams.dateFrom).trim(),
    dateTo: getSingleValue(searchParams.dateTo).trim(),
  }
}

export function buildOperationsJobsSearchParams(filters: OperationsJobsFilters) {
  const params = new URLSearchParams()

  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.limit !== 20) params.set('limit', String(filters.limit))
  if (filters.status) params.set('status', filters.status)
  if (filters.type) params.set('type', filters.type)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)

  return params
}

export function buildOperationsAuditSearchParams(filters: OperationsAuditFilters) {
  const params = new URLSearchParams()

  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.limit !== 20) params.set('limit', String(filters.limit))
  if (filters.actorId) params.set('actorId', filters.actorId)
  if (filters.domain) params.set('domain', filters.domain)
  if (filters.action) params.set('action', filters.action)
  if (filters.resourceType) params.set('resourceType', filters.resourceType)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)

  return params
}

export function getOperationJobStatusLabel(status: OperationJobStatus) {
  switch (status) {
    case 'PENDING':
      return 'Pending'
    case 'PROCESSING':
      return 'Processing'
    case 'SUCCEEDED':
      return 'Succeeded'
    case 'FAILED':
      return 'Failed'
    case 'CANCELLED':
      return 'Cancelled'
  }
}

export function getOperationJobTypeLabel(type: OperationJobType) {
  switch (type) {
    case 'SEND_EMAIL':
      return 'Send email'
    case 'RECALCULATE_PRODUCT_METRICS':
      return 'Recalculate product metrics'
    case 'RECALCULATE_RISK_PROFILE':
      return 'Recalculate risk profile'
    case 'SYNC_SHIPMENT_STATUS':
      return 'Sync shipment status'
    case 'RELEASE_SELLER_FUNDS':
      return 'Release seller funds'
    case 'REFRESH_ANALYTICS':
      return 'Refresh analytics'
    case 'PROCESS_NOTIFICATION_DIGEST':
      return 'Process notification digest'
  }
}

export function getOperationsHealthTone(status: OperationsHealthSnapshot['deep']['status'] | 'unhealthy') {
  switch (status) {
    case 'ok':
      return 'success' as const
    case 'degraded':
      return 'warning' as const
    case 'unhealthy':
      return 'danger' as const
  }
}
