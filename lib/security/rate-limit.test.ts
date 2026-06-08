import { beforeEach, describe, expect, it } from 'vitest'
import { RateLimitExceededError } from '@/lib/errors/security'
import { assertRateLimit, rateLimitProfiles, resetRateLimitStore } from '@/lib/security/rate-limit'

function makeRequest(ip = '127.0.0.1') {
  return new Request('http://localhost/api/test', {
    headers: {
      'x-forwarded-for': ip,
    },
  })
}

describe('rate-limit', () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  it('allows requests within the configured window', () => {
    const request = makeRequest()

    expect(() =>
      assertRateLimit(request, { key: 'test', limit: 2, windowMs: 60_000 }),
    ).not.toThrow()
    expect(() =>
      assertRateLimit(request, { key: 'test', limit: 2, windowMs: 60_000 }),
    ).not.toThrow()
  })

  it('blocks requests above the configured limit', () => {
    const request = makeRequest()

    assertRateLimit(request, { key: 'test', limit: 1, windowMs: 60_000 })

    expect(() =>
      assertRateLimit(request, { key: 'test', limit: 1, windowMs: 60_000 }),
    ).toThrow(RateLimitExceededError)
  })

  it('uses user identity when provided', () => {
    const request = makeRequest('10.0.0.1')

    assertRateLimit(request, rateLimitProfiles.notificationMutations, { userId: 'user-1' })

    expect(() =>
      assertRateLimit(request, { ...rateLimitProfiles.notificationMutations, limit: 1 }, { userId: 'user-1' }),
    ).toThrow(RateLimitExceededError)

    expect(() =>
      assertRateLimit(request, { ...rateLimitProfiles.notificationMutations, limit: 1 }, { userId: 'user-2' }),
    ).not.toThrow()
  })
})
