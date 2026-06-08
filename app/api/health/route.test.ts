import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as GET_HEALTH } from '@/app/api/health/route'
import { GET as GET_DEEP_HEALTH } from '@/app/api/health/deep/route'
import { getDeepHealthStatus, getHealthStatus } from '@/features/health/health.service'

vi.mock('@/features/health/health.service', () => ({
  getHealthStatus: vi.fn(),
  getDeepHealthStatus: vi.fn(),
}))

describe('health routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns shallow health response', async () => {
    vi.mocked(getHealthStatus).mockResolvedValue({
      status: 'ok',
      timestamp: '2026-06-08T10:00:00.000Z',
      uptimeSeconds: 120,
    })

    const response = await GET_HEALTH()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      success: true,
      data: {
        status: 'ok',
        timestamp: '2026-06-08T10:00:00.000Z',
        uptimeSeconds: 120,
      },
    })
  })

  it('returns deep health with degraded status as 503', async () => {
    vi.mocked(getDeepHealthStatus).mockResolvedValue({
      status: 'degraded',
      timestamp: '2026-06-08T10:00:00.000Z',
      uptimeSeconds: 120,
      database: { ok: false },
      env: { ok: true, issues: [] },
      providers: {
        resendConfigured: false,
        liqpayConfigured: true,
        novaPoshtaConfigured: true,
      },
      featureFlags: {
        emailEnabled: false,
        paymentsEnabled: true,
        shippingEnabled: true,
        jobsEnabled: false,
      },
    })

    const response = await GET_DEEP_HEALTH()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('degraded')
  })
})
