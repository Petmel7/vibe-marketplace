import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/session/getSession', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/features/admin/operations/admin-operations.service', () => ({
  getAdminOperationsJobs: vi.fn(),
  recoverStaleAdminOperationsJobs: vi.fn(),
  runDueAdminOperationsJobs: vi.fn(),
}))

import { ForbiddenError } from '@/lib/errors/auth'
import { requireAuth } from '@/lib/session/getSession'
import {
  getAdminOperationsJobs,
  recoverStaleAdminOperationsJobs,
  runDueAdminOperationsJobs,
} from '@/features/admin/operations/admin-operations.service'
import { GET } from '@/app/api/admin/operations/jobs/route'
import { POST as recoverStalePOST } from '@/app/api/admin/operations/jobs/recover-stale/route'
import { POST } from '@/app/api/admin/operations/jobs/run-due/route'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetAdminOperationsJobs = vi.mocked(getAdminOperationsJobs)
const mockRecoverStaleAdminOperationsJobs = vi.mocked(recoverStaleAdminOperationsJobs)
const mockRunDueAdminOperationsJobs = vi.mocked(runDueAdminOperationsJobs)

describe('admin operations jobs routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('admin can list jobs with filters and pagination', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] })
    mockGetAdminOperationsJobs.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    })

    const response = await GET(
      new Request('http://localhost/api/admin/operations/jobs?status=FAILED&type=SEND_EMAIL&limit=20') as never,
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetAdminOperationsJobs).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
      {
        page: 1,
        limit: 20,
        status: 'FAILED',
        type: 'SEND_EMAIL',
      },
    )
    expect(json.success).toBe(true)
  })

  it('non-admin is blocked from jobs list', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'buyer-1', email: 'buyer@example.com', roles: ['BUYER'] })
    mockGetAdminOperationsJobs.mockRejectedValue(new ForbiddenError())

    const response = await GET(new Request('http://localhost/api/admin/operations/jobs') as never)

    expect(response.status).toBe(403)
  })

  it('admin can run due jobs with bounded input', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] })
    mockRunDueAdminOperationsJobs.mockResolvedValue({
      processed: 2,
      succeeded: 2,
      failed: 0,
      recovered: 0,
      items: [],
    })

    const response = await POST(
      new Request('http://localhost/api/admin/operations/jobs/run-due', {
        method: 'POST',
        body: JSON.stringify({ limit: 10 }),
      }),
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockRunDueAdminOperationsJobs).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
      { limit: 10 },
    )
    expect(json.success).toBe(true)
  })

  it('admin can recover stale jobs manually', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] })
    mockRecoverStaleAdminOperationsJobs.mockResolvedValue({
      recoveredCount: 2,
      recoveredJobIds: ['job-1', 'job-2'],
    })

    const response = await recoverStalePOST(
      new Request('http://localhost/api/admin/operations/jobs/recover-stale', {
        method: 'POST',
        body: JSON.stringify({ limit: 10 }),
      }),
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockRecoverStaleAdminOperationsJobs).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
      { limit: 10 },
    )
    expect(json.success).toBe(true)
  })
})
