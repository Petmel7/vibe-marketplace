import { DatabaseError } from './app'

export class DatabaseUnavailableError extends DatabaseError {

  constructor(
    message = 'Database temporarily unavailable. Please try again.'
  ) {
    super(message, 'DATABASE_UNAVAILABLE')
    this.name = 'DatabaseUnavailableError'
  }
}
