export class AdminAccessError extends Error {
  readonly code = 'FORBIDDEN'
  readonly statusCode = 403
  constructor(message = 'Admin access required') {
    super(message)
    this.name = 'AdminAccessError'
  }
}

export class SelfModerationError extends Error {
  readonly code = 'SELF_MODERATION'
  readonly statusCode = 400
  constructor(message = 'Admin cannot moderate their own account') {
    super(message)
    this.name = 'SelfModerationError'
  }
}

export class InvalidModerationTransitionError extends Error {
  readonly code = 'INVALID_MODERATION_TRANSITION'
  readonly statusCode = 400
  constructor(from: string, to: string) {
    super(`Cannot transition from "${from}" to "${to}"`)
    this.name = 'InvalidModerationTransitionError'
  }
}

export class AlreadyModeratedError extends Error {
  readonly code = 'ALREADY_MODERATED'
  readonly statusCode = 409
  constructor(message = 'This entity has already been moderated') {
    super(message)
    this.name = 'AlreadyModeratedError'
  }
}

export class ModerationReasonRequiredError extends Error {
  readonly code = 'REASON_REQUIRED'
  readonly statusCode = 400
  constructor(message = 'A moderation reason is required') {
    super(message)
    this.name = 'ModerationReasonRequiredError'
  }
}
