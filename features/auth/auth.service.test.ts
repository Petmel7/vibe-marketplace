import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { UserRole } from '@/app/generated/prisma/client'

// Mock the repository before importing the service so that the module
// resolution picks up our mocks instead of the real Prisma-backed functions.
vi.mock('@/features/auth/auth.repository', () => ({
  findUserById: vi.fn(),
  createUserWithProfile: vi.fn(),
  getUserRoles: vi.fn(),
}))

import {
  findUserById,
  createUserWithProfile,
  getUserRoles,
} from '@/features/auth/auth.repository'
import { syncUser, getSessionUser } from '@/features/auth/auth.service'

// Typed mocks
const mockFindUserById = vi.mocked(findUserById)
const mockCreateUserWithProfile = vi.mocked(createUserWithProfile)
const mockGetUserRoles = vi.mocked(getUserRoles)

function makeSupabaseUser(overrides?: Partial<SupabaseUser>): SupabaseUser {
  return {
    id: 'user-uuid-001',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  } as SupabaseUser
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('syncUser', () => {
  it('creates a new user on first login (calls createUserWithProfile)', async () => {
    const supabaseUser = makeSupabaseUser()
    mockFindUserById.mockResolvedValueOnce(null)
    mockCreateUserWithProfile.mockResolvedValueOnce({
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockGetUserRoles.mockResolvedValueOnce([UserRole.BUYER])

    await syncUser(supabaseUser)

    expect(mockCreateUserWithProfile).toHaveBeenCalledOnce()
    expect(mockCreateUserWithProfile).toHaveBeenCalledWith(
      supabaseUser.id,
      supabaseUser.email
    )
  })

  it('does NOT call createUserWithProfile on subsequent login (user already exists)', async () => {
    const supabaseUser = makeSupabaseUser()
    mockFindUserById.mockResolvedValueOnce({
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockGetUserRoles.mockResolvedValueOnce([UserRole.BUYER])

    await syncUser(supabaseUser)

    expect(mockCreateUserWithProfile).not.toHaveBeenCalled()
  })

  it('always assigns BUYER role on creation — returned roles include BUYER', async () => {
    const supabaseUser = makeSupabaseUser()
    mockFindUserById.mockResolvedValueOnce(null)
    mockCreateUserWithProfile.mockResolvedValueOnce({
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockGetUserRoles.mockResolvedValueOnce([UserRole.BUYER])

    const result = await syncUser(supabaseUser)

    expect(result.roles).toContain(UserRole.BUYER)
  })

  it('returns a correctly shaped SessionUser DTO', async () => {
    const supabaseUser = makeSupabaseUser({ id: 'abc-123', email: 'a@b.com' })
    mockFindUserById.mockResolvedValueOnce({
      id: 'abc-123',
      email: 'a@b.com',
      name: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockGetUserRoles.mockResolvedValueOnce([UserRole.BUYER])

    const result = await syncUser(supabaseUser)

    expect(result).toEqual({ id: 'abc-123', email: 'a@b.com', roles: [UserRole.BUYER] })
  })
})

describe('getSessionUser', () => {
  it('returns correct DTO without calling createUserWithProfile', async () => {
    const supabaseUser = makeSupabaseUser({ id: 'xyz-999', email: 'seller@shop.com' })
    mockGetUserRoles.mockResolvedValueOnce([UserRole.BUYER, UserRole.SELLER])

    const result = await getSessionUser(supabaseUser)

    expect(mockCreateUserWithProfile).not.toHaveBeenCalled()
    expect(mockFindUserById).not.toHaveBeenCalled()
    expect(result).toEqual({
      id: 'xyz-999',
      email: 'seller@shop.com',
      roles: [UserRole.BUYER, UserRole.SELLER],
    })
  })
})
