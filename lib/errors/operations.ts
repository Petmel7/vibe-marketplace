export class OperationsAccessDeniedError extends Error {
  readonly code = 'OPERATIONS_ACCESS_DENIED'

  constructor(message = 'Operations access denied') {
    super(message)
    this.name = 'OperationsAccessDeniedError'
  }
}

export class InvalidJobTransitionError extends Error {
  readonly code = 'INVALID_JOB_TRANSITION'

  constructor(message = 'Job transition is not allowed') {
    super(message)
    this.name = 'InvalidJobTransitionError'
  }
}

export class AuditLogNotFoundError extends Error {
  readonly code = 'AUDIT_LOG_NOT_FOUND'

  constructor(message = 'Audit log not found') {
    super(message)
    this.name = 'AuditLogNotFoundError'
  }
}
