import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/session/getSession', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/features/jobs/jobs.service', () => ({
  getAdminJobs: vi.fn(),
}))

import { ForbiddenError } from '@/lib/errors/auth'
import { requireAuth } from '@/lib/session/getSession'
import { getAdminJobs } from '@/features/jobs/jobs.service'
import { GET } from '@/app/api/admin/jobs/route'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetAdminJobs = vi.mocked(getAdminJobs)

describe('GET /api/admin/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists recent jobs for admins', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      roles: ['ADMIN'],
    })
    mockGetAdminJobs.mockResolvedValue({
      items: [
        {
          id: 'job-1',
          type: 'SEND_EMAIL',
          payload: { emailEventId: 'event-1' },
          status: 'PENDING',
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
          updatedAt: '2026-06-08T12:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })

    const response = await GET(new Request('http://localhost/api/admin/jobs?limit=20') as never)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetAdminJobs).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
      { page: 1, limit: 20 },
    )
    expect(json.success).toBe(true)
  })

  it('returns forbidden for non-admin users', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'buyer-1',
      email: 'buyer@example.com',
      roles: ['BUYER'],
    })
    mockGetAdminJobs.mockRejectedValue(new ForbiddenError())

    const response = await GET(new Request('http://localhost/api/admin/jobs') as never)
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json).toEqual({
      success: false,
      error: {
        message: 'Forbidden',
        code: 'FORBIDDEN',
      },
    })
  })
})
