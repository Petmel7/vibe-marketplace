import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { logError, logInfo } from '@/utils/logger'

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}))

describe('recordAdminAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes a structured admin audit entry', async () => {
    await recordAdminAudit({
      actorId: 'admin-1',
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
        targetId: 'refund-1',
        targetType: 'refund-request',
        requestId: 'req-1',
      }),
    )
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
