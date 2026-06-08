import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAdminAuditLogById,
  listAdminAuditLogs,
  recordAdminAudit,
  redactAuditMetadata,
  resetAdminAuditLogBuffer,
} from '@/features/admin/audit/admin-audit'
import { logError, logInfo } from '@/utils/logger'

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}))

describe('admin audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAdminAuditLogBuffer()
  })

  it('writes a structured admin audit entry', async () => {
    await recordAdminAudit({
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      action: 'approve',
      domain: 'refunds',
      targetId: 'refund-1',
      targetType: 'refund-request',
      metadata: { note: 'approved' },
      requestId: 'req-1',
    })

    expect(logInfo).toHaveBeenCalledWith(
      'admin-audit',
      expect.objectContaining({
        auditDomain: 'refunds',
        action: 'approve',
        actorId: 'admin-1',
        actorEmail: 'admin@example.com',
        targetId: 'refund-1',
        targetType: 'refund-request',
        requestId: 'req-1',
      }),
    )
  })

  it('redacts sensitive metadata keys', () => {
    expect(
      redactAuditMetadata({
        safe: 'value',
        authorization: 'Bearer secret',
        rawBody: '{"card":"1234"}',
        nested: {
          privateKey: 'super-secret',
        },
      }),
    ).toEqual({
      safe: 'value',
      authorization: '[redacted]',
      rawBody: '[redacted]',
      nested: {
        privateKey: '[redacted]',
      },
    })
  })

  it('lists audit logs with pagination and filters', async () => {
    await recordAdminAudit({
      actorId: 'admin-1',
      action: 'approve',
      domain: 'refunds',
      targetId: 'refund-1',
      targetType: 'refund-request',
      metadata: { status: 'approved' },
    })
    await recordAdminAudit({
      actorId: 'admin-2',
      action: 'suspend',
      domain: 'moderation',
      targetId: 'seller-1',
      targetType: 'seller',
      metadata: { reason: 'abuse' },
    })

    const filtered = await listAdminAuditLogs({
      page: 1,
      limit: 1,
      domain: 'refunds',
    })

    expect(filtered.total).toBe(1)
    expect(filtered.items).toHaveLength(1)
    expect(filtered.items[0]?.domain).toBe('refunds')
  })

  it('returns an audit log by id', async () => {
    await recordAdminAudit({
      actorId: 'admin-1',
      action: 'approve',
      domain: 'refunds',
      targetId: 'refund-1',
      targetType: 'refund-request',
    })

    const list = await listAdminAuditLogs({ page: 1, limit: 10 })
    const found = await getAdminAuditLogById(list.items[0]!.id)

    expect(found.id).toBe(list.items[0]!.id)
    expect(found.resourceType).toBe('refund-request')
  })

  it('fails safely when audit logging throws', async () => {
    vi.mocked(logInfo).mockImplementationOnce(() => {
      throw new Error('logger down')
    })

    await expect(
      recordAdminAudit({
        actorId: 'admin-1',
        action: 'recalculate',
        domain: 'risk',
        targetType: 'risk-profile-batch',
      }),
    ).resolves.toBeUndefined()

    expect(logError).toHaveBeenCalledWith(
      'admin-audit:write-failed',
      expect.any(Error),
      expect.objectContaining({
        auditDomain: 'risk',
        action: 'recalculate',
        actorId: 'admin-1',
      }),
    )
  })
})
