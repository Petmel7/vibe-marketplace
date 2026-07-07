import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { UserRole } from '@/app/generated/prisma/client'

vi.mock('@/features/auth/auth.repository', () => ({
  ensureUserProvisioned: vi.fn(),
  getUserRoles: vi.fn(),
}))

vi.mock('@/features/email/events/email.events', () => ({
  emitWelcomeEmailEvent: vi.fn(),
}))

import { ensureUserProvisioned, getUserRoles } from '@/features/auth/auth.repository'
import { emitWelcomeEmailEvent } from '@/features/email/events/email.events'
import { getSessionUser, syncUser } from '@/features/auth/auth.service'

const mockEnsureUserProvisioned = vi.mocked(ensureUserProvisioned)
const mockGetUserRoles = vi.mocked(getUserRoles)
const mockEmitWelcomeEmailEvent = vi.mocked(emitWelcomeEmailEvent)

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
  mockEmitWelcomeEmailEvent.mockResolvedValue({} as never)
})

describe('syncUser', () => {
  it('creates and provisions a new user on first login', async () => {
    const supabaseUser = makeSupabaseUser()
    mockEnsureUserProvisioned.mockResolvedValueOnce({
      created: true,
      roles: [UserRole.BUYER],
    })

    await syncUser(supabaseUser)

    expect(mockEnsureUserProvisioned).toHaveBeenCalledOnce()
    expect(mockEnsureUserProvisioned).toHaveBeenCalledWith(supabaseUser.id, supabaseUser.email)
    expect(mockEmitWelcomeEmailEvent).toHaveBeenCalledWith({
      userId: supabaseUser.id,
      email: supabaseUser.email,
    })
  })

  it('does not enqueue a welcome email on subsequent login when the user already exists', async () => {
    const supabaseUser = makeSupabaseUser()
    mockEnsureUserProvisioned.mockResolvedValueOnce({
      created: false,
      roles: [UserRole.BUYER],
    })

    await syncUser(supabaseUser)

    expect(mockEmitWelcomeEmailEvent).not.toHaveBeenCalled()
  })

  it('always assigns BUYER role on creation and returns it in the session user', async () => {
    const supabaseUser = makeSupabaseUser()
    mockEnsureUserProvisioned.mockResolvedValueOnce({
      created: true,
      roles: [UserRole.BUYER],
    })

    const result = await syncUser(supabaseUser)

    expect(result.roles).toContain(UserRole.BUYER)
  })

  it('returns a correctly shaped SessionUser DTO', async () => {
    const supabaseUser = makeSupabaseUser({ id: 'abc-123', email: 'a@b.com' })
    mockEnsureUserProvisioned.mockResolvedValueOnce({
      created: false,
      roles: [UserRole.BUYER],
    })

    const result = await syncUser(supabaseUser)

    expect(result).toEqual({
      id: 'abc-123',
      email: 'a@b.com',
      roles: [UserRole.BUYER],
    })
  })

  it('does not break signup sync when welcome email enqueue fails', async () => {
    const supabaseUser = makeSupabaseUser()
    mockEnsureUserProvisioned.mockResolvedValueOnce({
      created: true,
      roles: [UserRole.BUYER],
    })
    mockEmitWelcomeEmailEvent.mockRejectedValueOnce(new Error('email down'))

    const result = await syncUser(supabaseUser)

    expect(result.roles).toContain(UserRole.BUYER)
  })

  it('repairs missing buyer provisioning for an existing local user', async () => {
    const supabaseUser = makeSupabaseUser({ id: 'repair-1', email: 'repair@example.com' })
    mockEnsureUserProvisioned.mockResolvedValueOnce({
      created: false,
      roles: [UserRole.BUYER],
    })

    const result = await syncUser(supabaseUser)

    expect(mockEnsureUserProvisioned).toHaveBeenCalledWith('repair-1', 'repair@example.com')
    expect(result.roles).toEqual([UserRole.BUYER])
    expect(mockEmitWelcomeEmailEvent).not.toHaveBeenCalled()
  })

  it('does not fetch roles again after provisioning returns them', async () => {
    const supabaseUser = makeSupabaseUser()
    mockEnsureUserProvisioned.mockResolvedValueOnce({
      created: false,
      roles: [UserRole.BUYER, UserRole.SELLER],
    })

    const result = await syncUser(supabaseUser)

    expect(result.roles).toEqual([UserRole.BUYER, UserRole.SELLER])
    expect(mockGetUserRoles).not.toHaveBeenCalled()
  })
})

describe('getSessionUser', () => {
  it('returns correct DTO without calling provisioning', async () => {
    const supabaseUser = makeSupabaseUser({ id: 'xyz-999', email: 'seller@shop.com' })
    mockGetUserRoles.mockResolvedValueOnce([UserRole.BUYER, UserRole.SELLER])

    const result = await getSessionUser(supabaseUser)

    expect(mockEnsureUserProvisioned).not.toHaveBeenCalled()
    expect(result).toEqual({
      id: 'xyz-999',
      email: 'seller@shop.com',
      roles: [UserRole.BUYER, UserRole.SELLER],
    })
  })
})
