export class JobNotFoundError extends Error {
  readonly code = 'JOB_NOT_FOUND'

  constructor(message = 'Job not found') {
    super(message)
    this.name = 'JobNotFoundError'
  }
}

export class JobDefinitionNotFoundError extends Error {
  readonly code = 'JOB_DEFINITION_NOT_FOUND'

  constructor(message = 'Job definition not found') {
    super(message)
    this.name = 'JobDefinitionNotFoundError'
  }
}

export class JobRetryLimitExceededError extends Error {
  readonly code = 'JOB_RETRY_LIMIT_EXCEEDED'

  constructor(message = 'Job retry limit exceeded') {
    super(message)
    this.name = 'JobRetryLimitExceededError'
  }
}

export class JobRunnerAuthError extends Error {
  readonly code = 'JOB_RUNNER_UNAUTHORIZED'

  constructor(message = 'Invalid job runner credentials') {
    super(message)
    this.name = 'JobRunnerAuthError'
  }
}

export class JobInvalidStateError extends Error {
  readonly code = 'JOB_INVALID_STATE'

  constructor(message = 'Job is not in a valid state for this operation') {
    super(message)
    this.name = 'JobInvalidStateError'
  }
}
