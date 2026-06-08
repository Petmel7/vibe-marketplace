import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/health/health.repository', () => ({
  pingDatabase: vi.fn(),
}))

vi.mock('@/config/env', () => ({
  getServerEnvDiagnostics: vi.fn(),
}))

async function loadHealthModules() {
  const service = await import('@/features/health/health.service')
  const repository = await import('@/features/health/health.repository')
  const env = await import('@/config/env')

  return {
    ...service,
    pingDatabase: vi.mocked(repository.pingDatabase),
    getServerEnvDiagnostics: vi.mocked(env.getServerEnvDiagnostics),
  }
}

describe('health.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns shallow health status', async () => {
    const { getHealthStatus } = await loadHealthModules()
    const status = await getHealthStatus()

    expect(status.status).toBe('ok')
    expect(status.timestamp).toEqual(expect.any(String))
    expect(status.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })

  it('returns deep health with database and env status', async () => {
    const { getDeepHealthStatus, pingDatabase, getServerEnvDiagnostics } = await loadHealthModules()

    pingDatabase.mockResolvedValue(true)
    getServerEnvDiagnostics.mockReturnValue({
      valid: true,
      env: {} as never,
      required: {
        databaseUrl: true,
        supabaseUrl: true,
        supabaseServiceRoleKey: true,
        appUrl: true,
        publicSupabaseUrl: true,
        publicSupabaseAnonKey: true,
      },
      providers: {
        resend: true,
        liqpay: false,
        novaPoshta: true,
      },
      featureFlags: {
        emailEnabled: true,
        paymentsEnabled: false,
        shippingEnabled: true,
        jobsEnabled: false,
      },
    })

    const status = await getDeepHealthStatus()

    expect(status.status).toBe('ok')
    expect(status.database.ok).toBe(true)
    expect(status.env.ok).toBe(true)
    expect(status.providers).toEqual({
      resendConfigured: true,
      liqpayConfigured: false,
      novaPoshtaConfigured: true,
    })
  })

  it('returns degraded health when database or env checks fail', async () => {
    const { getDeepHealthStatus, pingDatabase, getServerEnvDiagnostics } = await loadHealthModules()

    pingDatabase.mockRejectedValue(new Error('db down'))
    getServerEnvDiagnostics.mockReturnValue({
      valid: false,
      issues: [{ path: 'DATABASE_URL', message: 'Missing environment variable: DATABASE_URL' }],
    })

    const status = await getDeepHealthStatus()

    expect(status.status).toBe('degraded')
    expect(status.database.ok).toBe(false)
    expect(status.env.ok).toBe(false)
    expect(status.env.issues).toEqual([
      { path: 'DATABASE_URL', message: 'Missing environment variable: DATABASE_URL' },
    ])
  })
})
