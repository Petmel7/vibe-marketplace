import { describe, expect, it } from 'vitest'
import { RateLimitExceededError } from '@/lib/errors/security'
import { toErrorResponse } from '@/lib/errors/handleError'

describe('toErrorResponse', () => {
  it('does not expose raw unexpected errors', async () => {
    const response = toErrorResponse('test', new Error('database exploded'))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    })
  })

  it('returns retry metadata for rate limit errors', async () => {
    const response = toErrorResponse('test', new RateLimitExceededError(42))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    expect(body).toEqual({
      success: false,
      error: {
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    })
  })
})
