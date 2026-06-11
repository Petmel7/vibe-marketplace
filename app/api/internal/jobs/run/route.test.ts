import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({
  getServerEnv: vi.fn(),
}))

vi.mock('@/features/jobs/jobs.service', () => ({
  runDueJobs: vi.fn(),
}))

import { POST } from '@/app/api/internal/jobs/run/route'
import { getServerEnv } from '@/config/env'
import { runDueJobs } from '@/features/jobs/jobs.service'

describe('POST /api/internal/jobs/run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerEnv).mockReturnValue({
      JOB_RUNNER_SECRET: 'runner-secret',
    } as never)
  })

  it('blocks requests with an invalid secret', async () => {
    const request = new Request('http://localhost/api/internal/jobs/run', {
      method: 'POST',
      headers: {
        'x-job-runner-secret': 'wrong-secret',
      },
      body: JSON.stringify({ limit: 5 }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(vi.mocked(runDueJobs)).not.toHaveBeenCalled()
  })

  it('runs pending jobs when authenticated', async () => {
    vi.mocked(runDueJobs).mockResolvedValue({
      processed: 1,
      succeeded: 1,
      failed: 0,
      recovered: 0,
      items: [],
    })

    const request = new Request('http://localhost/api/internal/jobs/run', {
      method: 'POST',
      headers: {
        authorization: 'Bearer runner-secret',
      },
      body: JSON.stringify({ limit: 5 }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      success: true,
      data: {
        processed: 1,
        succeeded: 1,
        failed: 0,
        recovered: 0,
        items: [],
      },
    })
    expect(vi.mocked(runDueJobs)).toHaveBeenCalledWith({ limit: 5 })
  })
})
