import {
  AuthenticationError,
  AuthorizationError,
} from './app'

export class UnauthorizedError extends AuthenticationError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AuthorizationError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}
