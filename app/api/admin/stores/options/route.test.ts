import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/session/getSession', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/features/admin/oversight/admin-oversight.service', () => ({
  getAdminStoreOptions: vi.fn(),
}))

import { ForbiddenError } from '@/lib/errors/auth'
import { requireAuth } from '@/lib/session/getSession'
import { getAdminStoreOptions } from '@/features/admin/oversight/admin-oversight.service'
import { GET } from '@/app/api/admin/stores/options/route'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetAdminStoreOptions = vi.mocked(getAdminStoreOptions)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/admin/stores/options', () => {
  it('returns lightweight store options for admins', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      roles: ['ADMIN'],
    })
    mockGetAdminStoreOptions.mockResolvedValue({
      items: [
        {
          id: 'store-1',
          name: 'Atelier One',
          slug: 'atelier-one',
          ownerId: 'seller-1',
          ownerEmail: 'owner@example.com',
          isActive: true,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })

    const response = await GET(
      new Request('http://localhost/api/admin/stores/options?q=atelier&limit=20') as never,
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetAdminStoreOptions).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
      { page: 1, limit: 20, q: 'atelier' },
    )
    expect(json).toEqual({
      success: true,
      data: {
        items: [
          {
            id: 'store-1',
            name: 'Atelier One',
            slug: 'atelier-one',
            ownerId: 'seller-1',
            ownerEmail: 'owner@example.com',
            isActive: true,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      },
    })
  })

  it('returns forbidden for non-admin users', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'buyer-1',
      email: 'buyer@example.com',
      roles: ['BUYER'],
    })
    mockGetAdminStoreOptions.mockRejectedValue(new ForbiddenError())

    const response = await GET(new Request('http://localhost/api/admin/stores/options') as never)
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
