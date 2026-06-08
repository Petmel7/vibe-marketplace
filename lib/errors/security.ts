export class RateLimitExceededError extends Error {
  readonly code = 'RATE_LIMIT_EXCEEDED'
  readonly statusCode = 429
  readonly retryAfterSeconds: number

  constructor(retryAfterSeconds: number, message = 'Too many requests') {
    super(message)
    this.name = 'RateLimitExceededError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}
