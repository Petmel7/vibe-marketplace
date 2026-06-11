import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/features/jobs/jobs.service', () => ({
  getAdminJobById: vi.fn(),
  getAdminJobs: vi.fn(),
  recoverStaleAdminJobs: vi.fn(),
  requeueStaleAdminJob: vi.fn(),
  retryAdminJob: vi.fn(),
  cancelAdminJob: vi.fn(),
  runDueAdminJobs: vi.fn(),
}))

vi.mock('@/features/admin/audit/admin-audit', () => ({
  getAdminAuditLogById: vi.fn(),
  listAdminAuditLogs: vi.fn(),
  recordAdminAudit: vi.fn(),
}))

import { requireAdmin } from '@/lib/auth/guards'
import * as jobsService from '@/features/jobs/jobs.service'
import * as adminAudit from '@/features/admin/audit/admin-audit'
import {
  getAdminOperationsAuditLogById,
  getAdminOperationsAuditLogs,
  getAdminOperationsJobById,
  cancelAdminOperationsJob,
  requeueStaleAdminOperationsJob,
  retryAdminOperationsJob,
} from './admin-operations.service'
import { InvalidJobTransitionError, OperationsAccessDeniedError } from '@/lib/errors/operations'
import { JobInvalidStateError } from '@/lib/errors/job'

const mockRequireAdmin = vi.mocked(requireAdmin)
const mockJobsService = vi.mocked(jobsService)
const mockAdminAudit = vi.mocked(adminAudit)

const adminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: ['ADMIN'],
} as const

describe('admin operations service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockReturnValue(undefined)
  })

  it('maps job detail into operations-safe dto', async () => {
    mockJobsService.getAdminJobById.mockResolvedValue({
      id: 'job-1',
      type: 'SEND_EMAIL',
      payload: { emailEventId: 'event-1' },
      status: 'FAILED',
      attempts: 1,
      maxAttempts: 5,
      runAt: '2026-06-08T12:00:00.000Z',
      lockedAt: null,
      lockExpiresAt: null,
      stale: false,
      processedAt: null,
      failedAt: '2026-06-08T12:05:00.000Z',
      errorMessage: 'boom',
      dedupeKey: 'send-email:event-1',
      createdAt: '2026-06-08T12:00:00.000Z',
      updatedAt: '2026-06-08T12:05:00.000Z',
    } as never)

    const result = await getAdminOperationsJobById(adminUser as never, 'job-1')

    expect(result).not.toHaveProperty('payload')
    expect(result.id).toBe('job-1')
  })

  it('maps invalid retry state to InvalidJobTransitionError', async () => {
    mockJobsService.retryAdminJob.mockRejectedValue(new JobInvalidStateError('Only failed jobs can be retried'))

    await expect(
      retryAdminOperationsJob(adminUser as never, 'job-1'),
    ).rejects.toThrow(InvalidJobTransitionError)
  })

  it('maps invalid stale requeue state to InvalidJobTransitionError', async () => {
    mockJobsService.requeueStaleAdminJob.mockRejectedValue(
      new JobInvalidStateError('Only stale processing jobs can be requeued'),
    )

    await expect(
      requeueStaleAdminOperationsJob(adminUser as never, 'job-1'),
    ).rejects.toThrow(InvalidJobTransitionError)
  })

  it('blocks non-admin access with operations-specific access error', async () => {
    mockRequireAdmin.mockImplementation(() => {
      throw new Error('forbidden')
    })

    await expect(
      getAdminOperationsJobById(adminUser as never, 'job-1'),
    ).rejects.toThrow(OperationsAccessDeniedError)
  })

  it('reads audit logs from durable audit storage and maps dto shape', async () => {
    mockAdminAudit.listAdminAuditLogs.mockResolvedValue({
      items: [
        {
          id: 'audit-1',
          actorId: 'admin-1',
          actorEmail: 'admin@example.com',
          actorRole: 'ADMIN',
          domain: 'refunds',
          action: 'approve',
          resourceType: 'refund-request',
          resourceId: 'refund-1',
          metadata: { status: 'approved' },
          createdAt: '2026-06-11T10:00:00.000Z',
          ipAddress: null,
          userAgent: null,
          requestId: 'req-1',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    })

    const result = await getAdminOperationsAuditLogs(adminUser as never, {
      page: 1,
      limit: 20,
      resourceId: 'refund-1',
    })

    expect(mockAdminAudit.listAdminAuditLogs).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      resourceId: 'refund-1',
    })
    expect(result.items[0]).toEqual({
      id: 'audit-1',
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      domain: 'refunds',
      action: 'approve',
      resourceType: 'refund-request',
      resourceId: 'refund-1',
      metadata: { status: 'approved' },
      createdAt: '2026-06-11T10:00:00.000Z',
    })
  })

  it('reads one audit log by id from durable audit storage', async () => {
    mockAdminAudit.getAdminAuditLogById.mockResolvedValue({
      id: 'audit-1',
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      actorRole: 'ADMIN',
      domain: 'jobs',
      action: 'retry',
      resourceType: 'job',
      resourceId: 'job-1',
      metadata: { status: 'FAILED' },
      createdAt: '2026-06-11T10:00:00.000Z',
      ipAddress: null,
      userAgent: null,
      requestId: 'req-1',
    })

    const result = await getAdminOperationsAuditLogById(adminUser as never, 'audit-1')

    expect(result.resourceType).toBe('job')
    expect(result.resourceId).toBe('job-1')
  })

  it('audits successful admin job cancellation without changing business result', async () => {
    mockJobsService.cancelAdminJob.mockResolvedValue({
      id: 'job-1',
      type: 'SEND_EMAIL',
      payload: { emailEventId: 'event-1' },
      status: 'CANCELLED',
      attempts: 0,
      maxAttempts: 5,
      runAt: '2026-06-08T12:00:00.000Z',
      lockedAt: null,
      lockExpiresAt: null,
      stale: false,
      processedAt: null,
      failedAt: null,
      errorMessage: null,
      dedupeKey: 'send-email:event-1',
      createdAt: '2026-06-08T12:00:00.000Z',
      updatedAt: '2026-06-08T12:05:00.000Z',
    } as never)

    const result = await cancelAdminOperationsJob(adminUser as never, 'job-1')

    expect(result.status).toBe('CANCELLED')
    expect(mockAdminAudit.recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        actorRole: 'ADMIN',
        domain: 'jobs',
        action: 'cancel',
        targetId: 'job-1',
        targetType: 'job',
      }),
    )
  })
})
