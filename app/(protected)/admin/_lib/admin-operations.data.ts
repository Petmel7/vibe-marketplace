import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  AdminAuditLogQueryDto,
  AdminOperationsJobQueryDto,
} from '@/features/admin/operations/admin-operations.dto'
import {
  getAdminOperationsAuditLogs,
  getAdminOperationsJobs,
} from '@/features/admin/operations/admin-operations.service'
import { getDeepHealthStatus, getHealthStatus } from '@/features/health/health.service'
import { measureServerOperation } from '@/lib/observability/server-timing'
import {
  normalizeOperationsAuditFilters,
  normalizeOperationsJobsFilters,
  type AdminAuditLog,
  type DeepHealthStatus,
  type HealthStatus,
  type OperationsAuditFilters,
  type OperationsHealthSnapshot,
  type OperationsJobsFilters,
} from '@/types/operations'

type RawSearchParams = Record<string, string | string[] | undefined>

async function fetchHealthSnapshot(): Promise<OperationsHealthSnapshot> {
  const [basic, deep] = await Promise.all([
    measureServerOperation(
      'admin-operations-health-basic',
      {
        route: '/admin/operations',
        service: 'getHealthStatus',
      },
      () => getHealthStatus() as Promise<HealthStatus>,
    ),
    measureServerOperation(
      'admin-operations-health-deep',
      {
        route: '/admin/operations',
        service: 'getDeepHealthStatus',
      },
      () => getDeepHealthStatus() as Promise<DeepHealthStatus>,
    ),
  ])

  return {
    basic,
    deep,
    lastCheckedAt: new Date().toISOString(),
  }
}

function toJobQueryDto(filters: OperationsJobsFilters): AdminOperationsJobQueryDto {
  return {
    page: filters.page,
    limit: filters.limit,
    status: filters.status
      ? (filters.status as AdminOperationsJobQueryDto['status'])
      : undefined,
    type: filters.type
      ? (filters.type as AdminOperationsJobQueryDto['type'])
      : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }
}

function toAuditLogQueryDto(
  filters: OperationsAuditFilters,
): AdminAuditLogQueryDto {
  return {
    page: filters.page,
    limit: filters.limit,
    actorId: filters.actorId || undefined,
    domain: filters.domain || undefined,
    action: filters.action || undefined,
    resourceType: filters.resourceType || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }
}

async function fetchJobs(user: SessionUser, filters: OperationsJobsFilters) {
  return measureServerOperation(
    'admin-operations-jobs-list',
    {
      route: '/admin/operations/jobs',
      service: 'getAdminOperationsJobs',
    },
    () => getAdminOperationsJobs(user, toJobQueryDto(filters)),
  )
}

async function fetchAuditLogs(user: SessionUser, filters: OperationsAuditFilters) {
  return measureServerOperation(
    'admin-operations-audit-logs-list',
    {
      route: '/admin/operations/audit-logs',
      service: 'getAdminOperationsAuditLogs',
    },
    () => getAdminOperationsAuditLogs(user, toAuditLogQueryDto(filters)),
  )
}

export async function getAdminOperationsOverviewPageData(user: SessionUser) {
  const [healthResult, failedJobsResult, pendingJobsResult, auditResult] =
    await Promise.allSettled([
      fetchHealthSnapshot(),
      fetchJobs(user, {
        page: 1,
        limit: 5,
        status: 'FAILED',
        type: '',
        dateFrom: '',
        dateTo: '',
      }),
      fetchJobs(user, {
        page: 1,
        limit: 5,
        status: 'PENDING',
        type: '',
        dateFrom: '',
        dateTo: '',
      }),
      fetchAuditLogs(user, {
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
  const failedJobs =
    failedJobsResult.status === 'fulfilled' ? failedJobsResult.value : null
  const pendingJobs =
    pendingJobsResult.status === 'fulfilled' ? pendingJobsResult.value : null
  const recentAuditLogs =
    auditResult.status === 'fulfilled' ? auditResult.value : null

  const providerIssues = health
    ? [
        !health.deep.database.ok ? 'Database connectivity is degraded.' : null,
        !health.deep.env.ok
          ? 'Environment validation is reporting issues.'
          : null,
        !health.deep.providers.resendConfigured
          ? 'Resend is not configured.'
          : null,
        !health.deep.providers.liqpayConfigured
          ? 'LiqPay is not configured.'
          : null,
        !health.deep.providers.novaPoshtaConfigured
          ? 'Nova Poshta is not configured.'
          : null,
      ].filter((issue): issue is string => Boolean(issue))
    : []

  return {
    health,
    healthError: healthResult.status === 'rejected' ? healthResult.reason : null,
    failedJobs,
    pendingJobs,
    jobsError:
      failedJobsResult.status === 'rejected' ||
      pendingJobsResult.status === 'rejected'
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
      errorMessage:
        error instanceof Error
          ? error.message
          : 'Не вдалося завантажити health diagnostics.',
    }
  }
}

export async function getAdminOperationsJobsPageData(
  user: SessionUser,
  searchParams: RawSearchParams,
) {
  const filters = normalizeOperationsJobsFilters(searchParams)

  try {
    const jobs = await fetchJobs(user, filters)

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
      errorMessage:
        error instanceof Error ? error.message : 'Не вдалося завантажити jobs.',
    }
  }
}

export async function getAdminOperationsAuditLogsPageData(
  user: SessionUser,
  searchParams: RawSearchParams,
) {
  const filters = normalizeOperationsAuditFilters(searchParams)

  try {
    const auditLogs = await fetchAuditLogs(user, filters)

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
      errorMessage:
        error instanceof Error
          ? error.message
          : 'Не вдалося завантажити audit logs.',
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

  return keys
    .slice(0, 3)
    .map((key) => {
      const value = metadata[key]
      if (typeof value === 'string') {
        return `${key}: ${value}`
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return `${key}: ${String(value)}`
      }

      return `${key}: [structured]`
    })
    .join(' · ')
}
