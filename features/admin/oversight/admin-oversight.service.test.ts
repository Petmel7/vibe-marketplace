import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/oversight/admin-oversight.repository', () => ({
  findAllUsers: vi.fn(),
  findAllOrdersOversight: vi.fn(),
  findAllSellersOversight: vi.fn(),
  findAllProductsOversight: vi.fn(),
  findAdminStoreOptions: vi.fn(),
}))

vi.mock('@/lib/auth/adminGuards', () => ({
  assertAdminAccess: vi.fn(),
}))

import type { SessionUser } from '@/features/auth/auth.dto'
import * as repo from '@/features/admin/oversight/admin-oversight.repository'
import * as adminGuards from '@/lib/auth/adminGuards'
import { getAdminStoreOptions, getAllUsers } from '@/features/admin/oversight/admin-oversight.service'
import { AdminAccessError } from '@/lib/errors/admin'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(adminGuards)

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

const nonAdminUser: SessionUser = {
  id: 'buyer-1',
  email: 'buyer@example.com',
  roles: ['BUYER'],
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.assertAdminAccess.mockReturnValue(undefined)
})

describe('getAdminStoreOptions', () => {
  it('allows admins to list lightweight store options', async () => {
    mockRepo.findAdminStoreOptions.mockResolvedValue({
      items: [
        {
          id: 'store-1',
          name: 'Atelier One',
          slug: 'atelier-one',
          ownerId: 'seller-1',
          isActive: true,
          owner: { email: 'owner@example.com' },
          ignoredNestedField: { secret: true },
        },
      ],
      total: 1,
    } as never)

    const result = await getAdminStoreOptions(adminUser, { page: 1, limit: 20, q: 'atelier' })

    expect(mockGuards.assertAdminAccess).toHaveBeenCalledWith(adminUser)
    expect(mockRepo.findAdminStoreOptions).toHaveBeenCalledWith({ page: 1, limit: 20, q: 'atelier' })
    expect(result).toEqual({
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
    expect(result.items[0]).not.toHaveProperty('ignoredNestedField')
  })

  it('blocks non-admin access', async () => {
    mockGuards.assertAdminAccess.mockImplementationOnce(() => {
      throw new AdminAccessError()
    })

    await expect(getAdminStoreOptions(nonAdminUser, { page: 1, limit: 20 })).rejects.toBeInstanceOf(
      AdminAccessError,
    )
    expect(mockRepo.findAdminStoreOptions).not.toHaveBeenCalled()
  })

  it('returns search-filtered results sorted by repository output', async () => {
    mockRepo.findAdminStoreOptions.mockResolvedValue({
      items: [
        {
          id: 'store-2',
          name: 'Bravo Boutique',
          slug: 'bravo-boutique',
          ownerId: 'seller-2',
          isActive: false,
          owner: { email: 'bravo@example.com' },
        },
      ],
      total: 1,
    } as never)

    const result = await getAdminStoreOptions(adminUser, { page: 2, limit: 5, q: 'bravo' })

    expect(mockRepo.findAdminStoreOptions).toHaveBeenCalledWith({ page: 2, limit: 5, q: 'bravo' })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Bravo Boutique')
  })
})

describe('getAllUsers', () => {
  it('returns paginated admin user DTOs with mapped roles and profile name', async () => {
    mockRepo.findAllUsers.mockResolvedValue({
      items: [
        {
          id: 'user-1',
          email: 'user@example.com',
          createdAt: new Date('2026-06-25T00:00:00.000Z'),
          roles: [{ role: 'BUYER' }, { role: 'SELLER' }],
          profile: { displayName: 'Test User' },
        },
      ],
      total: 1,
    } as never)

    const result = await getAllUsers(adminUser, {
      page: 1,
      limit: 20,
      search: 'user',
      role: 'SELLER',
    })

    expect(mockGuards.assertAdminAccess).toHaveBeenCalledWith(adminUser)
    expect(mockRepo.findAllUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: 'user',
      role: 'SELLER',
    })
    expect(result).toEqual({
      items: [
        {
          id: 'user-1',
          email: 'user@example.com',
          createdAt: new Date('2026-06-25T00:00:00.000Z'),
          roles: ['BUYER', 'SELLER'],
          profileName: 'Test User',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
  })
})
