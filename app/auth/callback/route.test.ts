import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/features/auth/auth.service', () => ({
  syncUser: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const logErrorMock = vi.fn()
vi.mock('@/utils/logger', () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}))

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provisions the user during code exchange and redirects to the post-auth target', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { syncUser } = await import('@/features/auth/auth.service')
    const { GET } = await import('./route')

    vi.mocked(createServerClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        verifyOtp: vi.fn(),
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

    vi.mocked(syncUser).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      roles: ['BUYER'],
    })

    const response = await GET(
      new Request('https://example.com/auth/callback?code=test-code&next=%2Fprofile') as never,
    )

    expect(syncUser).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'user@example.com',
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://example.com/profile')
  })

  it('redirects to login when callback parameters are missing', async () => {
    const { GET } = await import('./route')

    const response = await GET(
      new Request('https://example.com/auth/callback') as never,
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://example.com/login?notice=auth-required',
    )
  })
})
