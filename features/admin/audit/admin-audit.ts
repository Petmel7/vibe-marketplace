import { randomUUID } from 'node:crypto'
import { logError, logInfo } from '@/utils/logger'
import { AuditLogNotFoundError } from '@/lib/errors/operations'

export type AdminAuditDomain =
  | 'moderation'
  | 'payouts'
  | 'refunds'
  | 'commission-rules'
  | 'promotions'
  | 'seo'
  | 'risk'

export type AdminAuditEntry = {
  actorId: string
  actorEmail?: string | null
  action: string
  domain: AdminAuditDomain
  targetId?: string | null
  targetType: string
  metadata?: Record<string, unknown> | null
  requestId?: string | null
}

export type AdminAuditLogRecord = {
  id: string
  actorId: string
  actorEmail: string | null
  domain: AdminAuditDomain
  action: string
  resourceType: string
  resourceId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  requestId: string | null
}

export type AdminAuditLogQuery = {
  page: number
  limit: number
  actorId?: string
  domain?: string
  action?: string
  resourceType?: string
  dateFrom?: string
  dateTo?: string
}

const AUDIT_LOG_BUFFER_LIMIT = 1000
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
]

const auditLogBuffer: AdminAuditLogRecord[] = []

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

function appendAuditRecord(record: AdminAuditLogRecord) {
  auditLogBuffer.unshift(record)
  if (auditLogBuffer.length > AUDIT_LOG_BUFFER_LIMIT) {
    auditLogBuffer.length = AUDIT_LOG_BUFFER_LIMIT
  }
}

function withinDateRange(record: AdminAuditLogRecord, query: AdminAuditLogQuery) {
  const createdAt = new Date(record.createdAt)

  if (query.dateFrom) {
    const from = new Date(query.dateFrom)
    if (createdAt < from) {
      return false
    }
  }

  if (query.dateTo) {
    const to = new Date(query.dateTo)
    if (createdAt > to) {
      return false
    }
  }

  return true
}

export async function recordAdminAudit(entry: AdminAuditEntry): Promise<void> {
  try {
    const metadata = redactAuditMetadata(entry.metadata)
    const record: AdminAuditLogRecord = {
      id: randomUUID(),
      actorId: entry.actorId,
      actorEmail: entry.actorEmail ?? null,
      domain: entry.domain,
      action: entry.action,
      resourceType: entry.targetType,
      resourceId: entry.targetId ?? null,
      metadata,
      createdAt: new Date().toISOString(),
      requestId: entry.requestId ?? null,
    }

    appendAuditRecord(record)

    logInfo('admin-audit', {
      domain: 'admin-audit',
      requestId: entry.requestId ?? null,
      auditDomain: entry.domain,
      action: entry.action,
      actorId: entry.actorId,
      actorEmail: entry.actorEmail ?? null,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType,
      metadata,
    })
  } catch (error) {
    logError('admin-audit:write-failed', error, {
      requestId: entry.requestId ?? null,
      auditDomain: entry.domain,
      action: entry.action,
      actorId: entry.actorId,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType,
    })
  }
}

export async function listAdminAuditLogs(query: AdminAuditLogQuery) {
  const filtered = auditLogBuffer.filter((record) => {
    if (query.actorId && record.actorId !== query.actorId) {
      return false
    }
    if (query.domain && record.domain !== query.domain) {
      return false
    }
    if (query.action && record.action !== query.action) {
      return false
    }
    if (query.resourceType && record.resourceType !== query.resourceType) {
      return false
    }

    return withinDateRange(record, query)
  })

  const start = (query.page - 1) * query.limit
  const items = filtered.slice(start, start + query.limit)

  return {
    items,
    total: filtered.length,
    page: query.page,
    limit: query.limit,
  }
}

export async function getAdminAuditLogById(id: string) {
  const record = auditLogBuffer.find((item) => item.id === id)
  if (!record) {
    throw new AuditLogNotFoundError()
  }

  return record
}

export function resetAdminAuditLogBuffer() {
  auditLogBuffer.length = 0
}
