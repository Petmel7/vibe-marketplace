import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  AdminAuditLogQueryDto,
  AdminOperationsJobQueryDto,
} from '@/features/admin/operations/admin-operations.dto'
import {
  getAdminOperationsAuditLogs,
  getAdminOperationsAuditLogsOverview,
  getAdminOperationsJobsOverview,
  getAdminOperationsJobs,
} from '@/features/admin/operations/admin-operations.service'
import { getDeepHealthStatus, getHealthStatus } from '@/features/health/health.service'
import { measureServerOperation } from '@/lib/observability/server-timing'
import { getCurrentRequestTrace } from '@/lib/observability/request-trace'
import { logInfo } from '@/utils/logger'
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
const ADMIN_OPERATIONS_AUDIT_OVERVIEW_TIMEOUT_MS = 5_000

function createOverviewBranchTimeoutError(branch: string, timeoutMs: number) {
  const error = new Error(`${branch} timed out after ${timeoutMs}ms`)
  error.name = 'AdminOperationsOverviewTimeoutError'
  return error
}

async function traceAsyncBoundary<T>(
  label: string,
  context: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const trace = getCurrentRequestTrace()
  const startedAt = Date.now()
  const enrichedContext = {
    ...context,
    requestId: trace?.requestId ?? null,
    route: trace?.route ?? '/admin/operations',
  }

  logInfo(`${label}:before`, enrichedContext)

  try {
    const result = await run()
    logInfo(`${label}:after-resolve`, {
      ...enrichedContext,
      durationMs: Date.now() - startedAt,
    })
    return result
  } catch (error) {
    logInfo(`${label}:after-reject`, {
      ...enrichedContext,
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

async function withOverviewBranchTimeout<T>(
  branch: string,
  timeoutMs: number,
  run: () => Promise<T>,
) {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timeoutId = setTimeout(() => {
      if (settled) {
        return
      }

      settled = true
      logInfo('admin-operations:overview-branch-timeout', {
        domain: 'admin-operations',
        route: '/admin/operations',
        branch,
        timeoutMs,
      })
      reject(createOverviewBranchTimeoutError(branch, timeoutMs))
    }, timeoutMs)

    void run()
      .then((result) => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

async function fetchHealthSnapshot(): Promise<OperationsHealthSnapshot> {
  logInfo('admin-operations:health-snapshot:before-promise-all', {
    domain: 'admin-operations',
    route: '/admin/operations',
  })
  const [basic, deep] = await Promise.all([
    traceAsyncBoundary(
      'admin-operations:health-basic',
      {
        domain: 'admin-operations',
        route: '/admin/operations',
        service: 'getHealthStatus',
      },
      () =>
        measureServerOperation(
          'admin-operations-health-basic',
          {
            route: '/admin/operations',
            service: 'getHealthStatus',
          },
          () => getHealthStatus() as Promise<HealthStatus>,
        ),
    ),
    traceAsyncBoundary(
      'admin-operations:health-deep',
      {
        domain: 'admin-operations',
        route: '/admin/operations',
        service: 'getDeepHealthStatus',
      },
      () =>
        measureServerOperation(
          'admin-operations-health-deep',
          {
            route: '/admin/operations',
            service: 'getDeepHealthStatus',
          },
          () => getDeepHealthStatus() as Promise<DeepHealthStatus>,
        ),
    ),
  ])
  logInfo('admin-operations:health-snapshot:after-promise-all', {
    domain: 'admin-operations',
    route: '/admin/operations',
    deepStatus: deep.status,
  })

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
  return traceAsyncBoundary(
    'admin-operations:jobs-list',
    {
      domain: 'admin-operations',
      route: '/admin/operations/jobs',
      userId: user.id,
      page: filters.page,
      limit: filters.limit,
      status: filters.status || null,
      type: filters.type || null,
    },
    () =>
      measureServerOperation(
        'admin-operations-jobs-list',
        {
          route: '/admin/operations/jobs',
          service: 'getAdminOperationsJobs',
        },
        () => getAdminOperationsJobs(user, toJobQueryDto(filters)),
      ),
  )
}

async function fetchJobsOverview(user: SessionUser) {
  return traceAsyncBoundary(
    'admin-operations:jobs-overview',
    {
      domain: 'admin-operations',
      route: '/admin/operations',
      userId: user.id,
    },
    () =>
      measureServerOperation(
        'admin-operations-jobs-overview',
        {
          route: '/admin/operations',
          service: 'getAdminOperationsJobsOverview',
        },
        () => getAdminOperationsJobsOverview(user),
      ),
  )
}

async function fetchAuditLogs(user: SessionUser, filters: OperationsAuditFilters) {
  return traceAsyncBoundary(
    'admin-operations:audit-logs-list',
    {
      domain: 'admin-operations',
      route: '/admin/operations/audit-logs',
      userId: user.id,
      page: filters.page,
      limit: filters.limit,
    },
    () =>
      measureServerOperation(
        'admin-operations-audit-logs-list',
        {
          route: '/admin/operations/audit-logs',
          service: 'getAdminOperationsAuditLogs',
        },
        () => getAdminOperationsAuditLogs(user, toAuditLogQueryDto(filters)),
      ),
  )
}

async function fetchAuditLogsOverview(user: SessionUser, filters: OperationsAuditFilters) {
  return traceAsyncBoundary(
    'admin-operations:audit-logs-overview',
    {
      domain: 'admin-operations',
      route: '/admin/operations',
      userId: user.id,
      page: filters.page,
      limit: filters.limit,
    },
    async () => {
      logInfo('admin-operations:audit-logs-overview:before-audit-service-call', {
        domain: 'admin-operations',
        route: '/admin/operations',
        userId: user.id,
        page: filters.page,
        limit: filters.limit,
      })

      try {
        const result = await getAdminOperationsAuditLogsOverview(user, toAuditLogQueryDto(filters))
        logInfo('admin-operations:audit-logs-overview:after-audit-service-resolve', {
          domain: 'admin-operations',
          route: '/admin/operations',
          userId: user.id,
          itemCount: result.items.length,
        })
        return result
      } catch (error) {
        logInfo('admin-operations:audit-logs-overview:after-audit-service-reject', {
          domain: 'admin-operations',
          route: '/admin/operations',
          userId: user.id,
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      } finally {
        logInfo('admin-operations:audit-logs-overview:finally-audit-branch', {
          domain: 'admin-operations',
          route: '/admin/operations',
          userId: user.id,
        })
      }
    },
  )
}

export async function getAdminOperationsOverviewPageData(user: SessionUser) {
  const trace = getCurrentRequestTrace()
  const promiseAllStartedAt = Date.now()
  logInfo('admin-operations-overview-data:start', {
    domain: 'admin-operations',
    route: '/admin/operations',
    userId: user.id,
    requestId: trace?.requestId ?? null,
  })
  logInfo('admin-operations-overview-data:before-promise-all-settled', {
    domain: 'admin-operations',
    route: '/admin/operations',
    userId: user.id,
    requestId: trace?.requestId ?? null,
  })
  const [healthResult, jobsOverviewResult, auditResult] = await Promise.allSettled([
    traceAsyncBoundary(
      'admin-operations:overview-health-branch',
      {
        domain: 'admin-operations',
        route: '/admin/operations',
        userId: user.id,
      },
      () => fetchHealthSnapshot(),
    ),
    traceAsyncBoundary(
      'admin-operations:overview-jobs-branch',
      {
        domain: 'admin-operations',
        route: '/admin/operations',
        userId: user.id,
      },
      () => fetchJobsOverview(user),
    ),
    traceAsyncBoundary(
      'admin-operations:overview-audit-branch',
      {
        domain: 'admin-operations',
        route: '/admin/operations',
        userId: user.id,
      },
      () =>
        withOverviewBranchTimeout(
          'audit',
          ADMIN_OPERATIONS_AUDIT_OVERVIEW_TIMEOUT_MS,
          () =>
            fetchAuditLogsOverview(user, {
              page: 1,
              limit: 5,
              actorId: '',
              domain: '',
              action: '',
              resourceType: '',
              dateFrom: '',
              dateTo: '',
            }),
        ),
    ),
  ])
  logInfo('admin-operations-overview-data:promise-all-settled-returned', {
    domain: 'admin-operations',
    route: '/admin/operations',
    userId: user.id,
    requestId: trace?.requestId ?? null,
    durationMs: Date.now() - promiseAllStartedAt,
    results: {
      health: healthResult.status,
      jobs: jobsOverviewResult.status,
      audit: auditResult.status,
    },
  })
  logInfo('admin-operations-overview-data:after-promise-all-settled', {
    domain: 'admin-operations',
    route: '/admin/operations',
    userId: user.id,
    requestId: trace?.requestId ?? null,
    healthStatus: healthResult.status,
    jobsStatus: jobsOverviewResult.status,
    auditStatus: auditResult.status,
  })

  const health = healthResult.status === 'fulfilled' ? healthResult.value : null
  const jobsOverview =
    jobsOverviewResult.status === 'fulfilled' ? jobsOverviewResult.value : null
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

  logInfo('admin-operations-overview-data:before-return', {
    domain: 'admin-operations',
    route: '/admin/operations',
    userId: user.id,
    hasHealth: Boolean(health),
    hasJobsOverview: Boolean(jobsOverview),
    auditItemCount: recentAuditLogs?.items.length ?? 0,
    providerIssueCount: providerIssues.length,
  })

  return {
    health,
    healthError: healthResult.status === 'rejected' ? healthResult.reason : null,
    jobsOverview,
    jobsError: jobsOverviewResult.status === 'rejected' ? jobsOverviewResult.reason : null,
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
