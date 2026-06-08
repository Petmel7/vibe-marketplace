import { RateLimitExceededError } from '@/lib/errors/security'
import { getClientIp } from '@/lib/security/request'

type RateLimitProfile = {
  limit: number
  windowMs: number
  key: string
}

type RateLimitOptions = {
  userId?: string | null
  resourceId?: string | null
}

type RateLimitState = {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitState>()

const MINUTE = 60_000

export const rateLimitProfiles = {
  auth: { key: 'auth', limit: 10, windowMs: 5 * MINUTE },
  checkout: { key: 'checkout', limit: 12, windowMs: 5 * MINUTE },
  paymentsWebhook: { key: 'payments-webhook', limit: 120, windowMs: MINUTE },
  reports: { key: 'reports', limit: 12, windowMs: 10 * MINUTE },
  reviews: { key: 'reviews', limit: 15, windowMs: 10 * MINUTE },
  refunds: { key: 'refunds', limit: 10, windowMs: 15 * MINUTE },
  disputes: { key: 'disputes', limit: 10, windowMs: 15 * MINUTE },
  notificationMutations: { key: 'notification-mutations', limit: 30, windowMs: MINUTE },
} satisfies Record<string, RateLimitProfile>

export function resetRateLimitStore() {
  rateLimitStore.clear()
}

function buildSubject(request: Request, options?: RateLimitOptions) {
  if (options?.userId) return `user:${options.userId}`
  return `ip:${getClientIp(request)}`
}

function buildKey(request: Request, profile: RateLimitProfile, options?: RateLimitOptions) {
  const subject = buildSubject(request, options)
  const resource = options?.resourceId ? `:${options.resourceId}` : ''
  return `${profile.key}:${subject}${resource}`
}

function consumeToken(key: string, profile: RateLimitProfile) {
  const now = Date.now()
  const current = rateLimitStore.get(key)

  if (!current || current.resetAt <= now) {
    const nextState = {
      count: 1,
      resetAt: now + profile.windowMs,
    }
    rateLimitStore.set(key, nextState)

    return {
      allowed: true,
      remaining: Math.max(0, profile.limit - nextState.count),
      retryAfterSeconds: Math.ceil(profile.windowMs / 1000),
    }
  }

  if (current.count >= profile.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  rateLimitStore.set(key, current)

  return {
    allowed: true,
    remaining: Math.max(0, profile.limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}

export function assertRateLimit(
  request: Request,
  profile: RateLimitProfile,
  options?: RateLimitOptions,
) {
  const key = buildKey(request, profile, options)
  const result = consumeToken(key, profile)

  if (!result.allowed) {
    throw new RateLimitExceededError(result.retryAfterSeconds)
  }

  return result
}
