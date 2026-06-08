import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/features/jobs/jobs.service', () => ({
  getAdminJobById: vi.fn(),
  getAdminJobs: vi.fn(),
  retryAdminJob: vi.fn(),
  cancelAdminJob: vi.fn(),
  runDueAdminJobs: vi.fn(),
}))

import { requireAdmin } from '@/lib/auth/guards'
import * as jobsService from '@/features/jobs/jobs.service'
import {
  getAdminOperationsJobById,
  retryAdminOperationsJob,
} from './admin-operations.service'
import { InvalidJobTransitionError, OperationsAccessDeniedError } from '@/lib/errors/operations'
import { JobInvalidStateError } from '@/lib/errors/job'

const mockRequireAdmin = vi.mocked(requireAdmin)
const mockJobsService = vi.mocked(jobsService)

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

  it('blocks non-admin access with operations-specific access error', async () => {
    mockRequireAdmin.mockImplementation(() => {
      throw new Error('forbidden')
    })

    await expect(
      getAdminOperationsJobById(adminUser as never, 'job-1'),
    ).rejects.toThrow(OperationsAccessDeniedError)
  })
})
