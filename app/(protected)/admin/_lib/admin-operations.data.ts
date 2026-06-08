import { headers } from 'next/headers'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import {
  buildOperationsAuditSearchParams,
  buildOperationsJobsSearchParams,
  normalizeOperationsAuditFilters,
  normalizeOperationsJobsFilters,
  type AdminAuditLog,
  type AdminAuditLogListResponse,
  type AdminOperationsJobListResponse,
  type DeepHealthStatus,
  type HealthStatus,
  type OperationsAuditFilters,
  type OperationsHealthSnapshot,
  type OperationsJobsFilters,
} from '@/types/operations'

type RawSearchParams = Record<string, string | string[] | undefined>

type ApiSuccess<T> = { success: true; data: T }
type ApiFailure = { success: false; error?: { message?: string } }

async function getRequestOrigin() {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')

  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  }

  const protocol =
    headerStore.get('x-forwarded-proto') ??
    (host.includes('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}

async function fetchApiData<T>(path: string, message: string): Promise<T> {
  const headerStore = await headers()
  const origin = await getRequestOrigin()
  const response = await fetch(`${origin}${path}`, {
    cache: 'no-store',
    headers: headerStore.get('cookie')
      ? {
          cookie: headerStore.get('cookie')!,
        }
      : undefined,
  })

  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.success === false ? payload.error?.message ?? message : message,
    )
  }

  return payload.data
}

async function fetchHealthSnapshot(): Promise<OperationsHealthSnapshot> {
  const [basic, deep] = await Promise.all([
    fetchApiData<HealthStatus>(API_ROUTES.health, 'Не вдалося отримати базовий health status.'),
    fetchApiData<DeepHealthStatus>(API_ROUTES.healthDeep, 'Не вдалося отримати розширений health status.'),
  ])

  return {
    basic,
    deep,
    lastCheckedAt: new Date().toISOString(),
  }
}

async function fetchJobs(filters: OperationsJobsFilters) {
  const params = buildOperationsJobsSearchParams(filters)
  const path = `${API_ROUTES.adminOperationsJobs}${params.size > 0 ? `?${params.toString()}` : ''}`

  return fetchApiData<AdminOperationsJobListResponse>(
    path,
    'Не вдалося завантажити jobs diagnostics.',
  )
}

async function fetchAuditLogs(filters: OperationsAuditFilters) {
  const params = buildOperationsAuditSearchParams(filters)
  const path = `${API_ROUTES.adminOperationsAuditLogs}${params.size > 0 ? `?${params.toString()}` : ''}`

  return fetchApiData<AdminAuditLogListResponse>(
    path,
    'Не вдалося завантажити audit logs.',
  )
}

export async function getAdminOperationsOverviewPageData() {
  const [healthResult, failedJobsResult, pendingJobsResult, auditResult] = await Promise.allSettled([
    fetchHealthSnapshot(),
    fetchJobs({
      page: 1,
      limit: 5,
      status: 'FAILED',
      type: '',
      dateFrom: '',
      dateTo: '',
    }),
    fetchJobs({
      page: 1,
      limit: 5,
      status: 'PENDING',
      type: '',
      dateFrom: '',
      dateTo: '',
    }),
    fetchAuditLogs({
      page: 1,
      limit: 5,
      actorId: '',
      domain: '',
      action: '',
      resourceType: '',
      dateFrom: '',
      dateTo: '',
    }),
  ])

  const health = healthResult.status === 'fulfilled' ? healthResult.value : null
  const failedJobs = failedJobsResult.status === 'fulfilled' ? failedJobsResult.value : null
  const pendingJobs = pendingJobsResult.status === 'fulfilled' ? pendingJobsResult.value : null
  const recentAuditLogs = auditResult.status === 'fulfilled' ? auditResult.value : null

  const providerIssues = health
    ? [
        !health.deep.database.ok ? 'Database connectivity is degraded.' : null,
        !health.deep.env.ok ? 'Environment validation is reporting issues.' : null,
        !health.deep.providers.resendConfigured ? 'Resend is not configured.' : null,
        !health.deep.providers.liqpayConfigured ? 'LiqPay is not configured.' : null,
        !health.deep.providers.novaPoshtaConfigured ? 'Nova Poshta is not configured.' : null,
      ].filter((issue): issue is string => Boolean(issue))
    : []

  return {
    health,
    healthError: healthResult.status === 'rejected' ? healthResult.reason : null,
    failedJobs,
    pendingJobs,
    jobsError:
      failedJobsResult.status === 'rejected' || pendingJobsResult.status === 'rejected'
        ? failedJobsResult.status === 'rejected'
          ? failedJobsResult.reason
          : pendingJobsResult.status === 'rejected'
            ? pendingJobsResult.reason
            : null
        : null,
    recentAuditLogs,
    auditError: auditResult.status === 'rejected' ? auditResult.reason : null,
    providerIssues,
  }
}

export async function getAdminOperationsHealthPageData() {
  try {
    return {
      status: 'ready' as const,
      snapshot: await fetchHealthSnapshot(),
      errorMessage: null,
    }
  } catch (error) {
    return {
      status: 'error' as const,
      snapshot: null,
      errorMessage: error instanceof Error ? error.message : 'Не вдалося завантажити health diagnostics.',
    }
  }
}

export async function getAdminOperationsJobsPageData(searchParams: RawSearchParams) {
  const filters = normalizeOperationsJobsFilters(searchParams)

  try {
    const jobs = await fetchJobs(filters)

    return {
      status: 'ready' as const,
      filters,
      jobs,
      errorMessage: null,
    }
  } catch (error) {
    return {
      status: 'error' as const,
      filters,
      jobs: null,
      errorMessage: error instanceof Error ? error.message : 'Не вдалося завантажити jobs.',
    }
  }
}

export async function getAdminOperationsAuditLogsPageData(searchParams: RawSearchParams) {
  const filters = normalizeOperationsAuditFilters(searchParams)

  try {
    const auditLogs = await fetchAuditLogs(filters)

    return {
      status: 'ready' as const,
      filters,
      auditLogs,
      errorMessage: null,
    }
  } catch (error) {
    return {
      status: 'error' as const,
      filters,
      auditLogs: null,
      errorMessage: error instanceof Error ? error.message : 'Не вдалося завантажити audit logs.',
    }
  }
}

export function getAuditMetadataPreview(metadata: AdminAuditLog['metadata']) {
  if (!metadata) {
    return 'No metadata summary'
  }

  const keys = Object.keys(metadata)
  if (keys.length === 0) {
    return 'Empty metadata'
  }

  return keys.slice(0, 3).map((key) => {
    const value = metadata[key]
    if (typeof value === 'string') {
      return `${key}: ${value}`
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return `${key}: ${String(value)}`
    }

    return `${key}: [structured]`
  }).join(' · ')
}
