import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/session/getSession', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/features/admin/operations/admin-operations.service', () => ({
  getAdminOperationsAuditLogs: vi.fn(),
}))

import { ForbiddenError } from '@/lib/errors/auth'
import { requireAuth } from '@/lib/session/getSession'
import { getAdminOperationsAuditLogs } from '@/features/admin/operations/admin-operations.service'
import { GET } from '@/app/api/admin/operations/audit-logs/route'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetAdminOperationsAuditLogs = vi.mocked(getAdminOperationsAuditLogs)

describe('admin operations audit logs route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('admin can list audit logs', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] })
    mockGetAdminOperationsAuditLogs.mockResolvedValue({
      items: [
        {
          id: 'audit-1',
          actorId: 'admin-1',
          actorEmail: 'admin@example.com',
          domain: 'refunds',
          action: 'approve',
          resourceType: 'refund-request',
          resourceId: 'refund-1',
          metadata: { note: 'approved' },
          createdAt: '2026-06-08T12:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    })

    const response = await GET(new Request('http://localhost/api/admin/operations/audit-logs?domain=refunds') as never)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetAdminOperationsAuditLogs).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
      { page: 1, limit: 20, domain: 'refunds' },
    )
    expect(json.success).toBe(true)
  })

  it('non-admin is blocked from audit logs', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'buyer-1', email: 'buyer@example.com', roles: ['BUYER'] })
    mockGetAdminOperationsAuditLogs.mockRejectedValue(new ForbiddenError())

    const response = await GET(new Request('http://localhost/api/admin/operations/audit-logs') as never)

    expect(response.status).toBe(403)
  })
})
