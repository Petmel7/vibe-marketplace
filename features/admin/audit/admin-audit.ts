import { logError, logInfo } from '@/utils/logger'

export type AdminAuditDomain =
  | 'moderation'
  | 'payouts'
  | 'refunds'
  | 'commission-rules'
  | 'promotions'
  | 'risk'

export type AdminAuditEntry = {
  actorId: string
  action: string
  domain: AdminAuditDomain
  targetId?: string | null
  targetType: string
  metadata?: Record<string, unknown> | null
  requestId?: string | null
}

export async function recordAdminAudit(entry: AdminAuditEntry): Promise<void> {
  try {
    logInfo('admin-audit', {
      domain: 'admin-audit',
      requestId: entry.requestId ?? null,
      auditDomain: entry.domain,
      action: entry.action,
      actorId: entry.actorId,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType,
      metadata: entry.metadata ?? null,
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
