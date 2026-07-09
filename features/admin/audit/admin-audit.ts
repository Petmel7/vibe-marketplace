import type { Prisma } from '@/app/generated/prisma/client'
import { logError, logInfo } from '@/utils/logger'
import { AuditLogNotFoundError } from '@/lib/errors/operations'
import {
  countAdminAuditLogRecords,
  createAdminAuditLogRecord,
  findAdminAuditLogRecordById,
  listAdminAuditLogOverviewRecords,
  listAdminAuditLogRecords,
} from './admin-audit.repository'

export type AdminAuditDomain =
  | 'orders'
  | 'payments'
  | 'shipping'
  | 'moderation'
  | 'payouts'
  | 'refunds'
  | 'commission-rules'
  | 'promotions'
  | 'seo'
  | 'risk'
  | 'jobs'
  | 'abuse-reports'
  | 'disputes'

export type AdminAuditEntry = {
  actorId: string
  actorEmail?: string | null
  actorRole?: string | null
  action: string
  domain: AdminAuditDomain
  targetId?: string | null
  targetType: string
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  requestId?: string | null
}

export type AdminAuditLogRecord = {
  id: string
  actorId: string | null
  actorEmail: string | null
  actorRole: string | null
  domain: AdminAuditDomain
  action: string
  resourceType: string
  resourceId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
}

export type AdminAuditLogQuery = {
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

type AdminAuditLogOverviewRecord = Awaited<ReturnType<typeof listAdminAuditLogOverviewRecords>>[number]

const REDACTED_VALUE = '[redacted]'
const AUDIT_REDACTED_KEYS = [
  'secret',
  'token',
  'key',
  'password',
  'cookie',
  'authorization',
  'signature',
  'payload',
  'private',
  'providerpayload',
  'rawbody',
  'webhookbody',
  'card',
  'pan',
  'cvv',
  'refresh',
  'liqpay',
  'nova',
]

export class AuditLogWriteError extends Error {
  constructor(message = 'Failed to persist admin audit log') {
    super(message)
    this.name = 'AuditLogWriteError'
  }
}

function shouldRedactAuditKey(key: string) {
  const normalized = key.toLowerCase()
  return AUDIT_REDACTED_KEYS.some((fragment) => normalized.includes(fragment))
}

function redactAuditMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 3) {
    return '[truncated]'
  }

  if (value == null) {
    return value
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => redactAuditMetadataValue(entry, depth + 1))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        shouldRedactAuditKey(key) ? REDACTED_VALUE : redactAuditMetadataValue(nestedValue, depth + 1),
      ]),
    )
  }

  return String(value)
}

export function redactAuditMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return null
  }

  return redactAuditMetadataValue(metadata) as Record<string, unknown>
}

function toRecordMetadata(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  return metadata as Record<string, unknown>
}

function toAdminAuditLogRecord(
  record: Awaited<ReturnType<typeof findAdminAuditLogRecordById>> extends infer T
    ? Exclude<T, null>
    : never,
): AdminAuditLogRecord {
  return {
    id: record.id,
    actorId: record.actorId ?? null,
    actorEmail: record.actorEmail ?? null,
    actorRole: record.actorRole ?? null,
    domain: record.domain as AdminAuditDomain,
    action: record.action,
    resourceType: record.resourceType,
    resourceId: record.resourceId ?? null,
    metadata: toRecordMetadata(record.metadata),
    createdAt: record.createdAt.toISOString(),
    ipAddress: record.ipAddress ?? null,
    userAgent: record.userAgent ?? null,
    requestId: record.requestId ?? null,
  }
}

function toAdminAuditLogOverviewRecord(
  record: AdminAuditLogOverviewRecord,
): AdminAuditLogRecord {
  return {
    id: record.id,
    actorId: record.actorId ?? null,
    actorEmail: record.actorEmail ?? null,
    actorRole: record.actorRole ?? null,
    domain: record.domain as AdminAuditDomain,
    action: record.action,
    resourceType: record.resourceType,
    resourceId: record.resourceId ?? null,
    metadata: null,
    createdAt: record.createdAt.toISOString(),
    ipAddress: null,
    userAgent: null,
    requestId: null,
  }
}

export async function recordAdminAudit(entry: AdminAuditEntry): Promise<void> {
  const metadata = redactAuditMetadata(entry.metadata)

  try {
    await createAdminAuditLogRecord({
      actorId: entry.actorId,
      actorEmail: entry.actorEmail ?? null,
      actorRole: entry.actorRole ?? null,
      domain: entry.domain,
      action: entry.action,
      resourceType: entry.targetType,
      resourceId: entry.targetId ?? null,
      metadata,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      requestId: entry.requestId ?? null,
    })
  } catch (error) {
    const auditError =
      error instanceof AuditLogWriteError
        ? error
        : new AuditLogWriteError(error instanceof Error ? error.message : undefined)

    logError('admin-audit:write-failed', auditError, {
      requestId: entry.requestId ?? null,
      auditDomain: entry.domain,
      action: entry.action,
      actorId: entry.actorId,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType,
    })
    return
  }

  try {
    logInfo('admin-audit', {
      domain: 'admin-audit',
      requestId: entry.requestId ?? null,
      auditDomain: entry.domain,
      action: entry.action,
      actorId: entry.actorId,
      actorEmail: entry.actorEmail ?? null,
      actorRole: entry.actorRole ?? null,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      metadata,
    })
  } catch {}
}

export async function listAdminAuditLogs(query: AdminAuditLogQuery) {
  logInfo('admin-audit:list:before-repository-list', {
    domain: 'admin-audit',
    page: query.page,
    limit: query.limit,
    resourceType: query.resourceType ?? null,
    resourceId: query.resourceId ?? null,
  })

  try {
    const items = await listAdminAuditLogRecords(query)
    logInfo('admin-audit:list:after-repository-list', {
      domain: 'admin-audit',
      page: query.page,
      limit: query.limit,
      itemCount: items.length,
    })

    logInfo('admin-audit:list:before-count', {
      domain: 'admin-audit',
      page: query.page,
      limit: query.limit,
    })
    const total = await countAdminAuditLogRecords(query)
    logInfo('admin-audit:list:after-count', {
      domain: 'admin-audit',
      page: query.page,
      limit: query.limit,
      total,
    })

    logInfo('admin-audit:list:before-dto-mapping', {
      domain: 'admin-audit',
      itemCount: items.length,
    })
    const mappedItems = items.map(toAdminAuditLogRecord)
    logInfo('admin-audit:list:after-dto-mapping', {
      domain: 'admin-audit',
      itemCount: mappedItems.length,
    })

    return {
      items: mappedItems,
      total,
      page: query.page,
      limit: query.limit,
    }
  } finally {
    logInfo('admin-audit:list:finally', {
      domain: 'admin-audit',
      page: query.page,
      limit: query.limit,
    })
  }
}

export async function listAdminAuditLogsOverview(query: AdminAuditLogQuery) {
  logInfo('admin-audit:overview:before-repository-list', {
    domain: 'admin-audit',
    page: query.page,
    limit: query.limit,
    resourceType: query.resourceType ?? null,
    resourceId: query.resourceId ?? null,
  })

  try {
    const items = await listAdminAuditLogOverviewRecords(query)
    logInfo('admin-audit:overview:after-repository-list', {
      domain: 'admin-audit',
      page: query.page,
      limit: query.limit,
      itemCount: items.length,
    })

    logInfo('admin-audit:overview:before-dto-mapping', {
      domain: 'admin-audit',
      itemCount: items.length,
    })
    const mappedItems = items.map(toAdminAuditLogOverviewRecord)
    logInfo('admin-audit:overview:after-dto-mapping', {
      domain: 'admin-audit',
      itemCount: mappedItems.length,
    })

    return {
      items: mappedItems,
      total: mappedItems.length,
      page: query.page,
      limit: query.limit,
    }
  } finally {
    logInfo('admin-audit:overview:finally', {
      domain: 'admin-audit',
      page: query.page,
      limit: query.limit,
    })
  }
}

export async function getAdminAuditLogById(id: string) {
  const record = await findAdminAuditLogRecordById(id)
  if (!record) {
    throw new AuditLogNotFoundError()
  }

  return toAdminAuditLogRecord(record)
}
