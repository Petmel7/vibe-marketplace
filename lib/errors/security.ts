import { AppError } from './app'

export class RateLimitExceededError extends AppError {
  readonly retryAfterSeconds: number

  constructor(retryAfterSeconds: number, message = 'Too many requests') {
    super({
      code: 'RATE_LIMIT_EXCEEDED',
      httpStatus: 429,
      publicMessage: message,
    })
    this.name = 'RateLimitExceededError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}
