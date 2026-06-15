import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/features/auth/auth.service', () => ({
  getSessionUser: vi.fn(),
}))

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the current session user without provisioning writes', async () => {
    vi.resetModules()

    const { createServerClient } = await import('@/lib/supabase/server')
    const { getSessionUser } = await import('@/features/auth/auth.service')

    vi.mocked(createServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'user@example.com',
            },
          },
        }),
      },
    } as never)

    vi.mocked(getSessionUser).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      roles: ['BUYER'],
    })

    const { getCurrentUser } = await import('@/lib/session/getSession')
    const user = await getCurrentUser()

    expect(getSessionUser).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'user@example.com',
    })
    expect(user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      roles: ['BUYER'],
    })
  })
})
