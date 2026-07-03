import { beforeEach, describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn()
const getServerEnvMock = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

vi.mock('@/config/env', () => ({
  getServerEnv: () => getServerEnvMock(),
}))

describe('createAdminClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerEnvMock.mockReturnValue({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    })
    createClientMock.mockReturnValue({ auth: {} })
  })

  it('disables auth auto refresh for the server-side service-role client', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')

    createAdminClient()

    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )
  })
})
