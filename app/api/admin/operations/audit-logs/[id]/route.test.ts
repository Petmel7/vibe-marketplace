import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/session/getSession', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/features/admin/operations/admin-operations.service', () => ({
  getAdminOperationsAuditLogById: vi.fn(),
}))

import { requireAuth } from '@/lib/session/getSession'
import { ForbiddenError } from '@/lib/errors/auth'
import { getAdminOperationsAuditLogById } from '@/features/admin/operations/admin-operations.service'
import { GET } from '@/app/api/admin/operations/audit-logs/[id]/route'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetAdminOperationsAuditLogById = vi.mocked(getAdminOperationsAuditLogById)

describe('admin operations audit log detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('admin can read one audit log', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] })
    mockGetAdminOperationsAuditLogById.mockResolvedValue({
      id: 'audit-1',
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      actorRole: 'ADMIN',
      domain: 'refunds',
      action: 'approve',
      resourceType: 'refund-request',
      resourceId: 'refund-1',
      metadata: { note: 'approved' },
      createdAt: '2026-06-11T10:00:00.000Z',
    })

    const response = await GET({} as never, {
      params: Promise.resolve({ id: 'audit-1' }),
    } as never)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetAdminOperationsAuditLogById).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
      'audit-1',
    )
    expect(json.success).toBe(true)
  })

  it('non-admin is blocked from audit log detail', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'buyer-1', email: 'buyer@example.com', roles: ['BUYER'] })
    mockGetAdminOperationsAuditLogById.mockRejectedValue(new ForbiddenError())

    const response = await GET({} as never, {
      params: Promise.resolve({ id: 'audit-1' }),
    } as never)

    expect(response.status).toBe(403)
  })
})
