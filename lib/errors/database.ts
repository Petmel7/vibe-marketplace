export class DatabaseUnavailableError extends Error {
  readonly code = 'DATABASE_UNAVAILABLE'
  readonly statusCode = 503

  constructor(
    message = 'Database temporarily unavailable. Please try again.'
  ) {
    super(message)
    this.name = 'DatabaseUnavailableError'
  }
}
