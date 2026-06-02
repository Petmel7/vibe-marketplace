export class DisputeNotFoundError extends Error {
  readonly code = 'DISPUTE_NOT_FOUND' as const

  constructor(message = 'Dispute not found') {
    super(message)
    this.name = 'DisputeNotFoundError'
  }
}

export class DisputeOwnershipError extends Error {
  readonly code = 'FORBIDDEN' as const

  constructor(message = 'You do not have access to this dispute') {
    super(message)
    this.name = 'DisputeOwnershipError'
  }
}

export class DuplicateDisputeError extends Error {
  readonly code = 'DUPLICATE_DISPUTE' as const

  constructor(message = 'An active dispute already exists for this order issue') {
    super(message)
    this.name = 'DuplicateDisputeError'
  }
}

export class InvalidDisputeTransitionError extends Error {
  readonly code = 'INVALID_DISPUTE_TRANSITION' as const

  constructor(message = 'This dispute status transition is invalid') {
    super(message)
    this.name = 'InvalidDisputeTransitionError'
  }
}

export class DisputeEvidenceUploadError extends Error {
  readonly code = 'DISPUTE_EVIDENCE_UPLOAD_ERROR' as const

  constructor(message = 'Unable to upload dispute evidence') {
    super(message)
    this.name = 'DisputeEvidenceUploadError'
  }
}

export class DisputeValidationError extends Error {
  readonly code = 'DISPUTE_VALIDATION_ERROR' as const

  constructor(message = 'The dispute request is invalid') {
    super(message)
    this.name = 'DisputeValidationError'
  }
}

export class InvalidDisputeEvidenceFileError extends Error {
  readonly code = 'INVALID_DISPUTE_EVIDENCE_FILE' as const

  constructor(message = 'The dispute evidence file is invalid') {
    super(message)
    this.name = 'InvalidDisputeEvidenceFileError'
  }
}

export class DisputeEvidenceLimitExceededError extends Error {
  readonly code = 'DISPUTE_EVIDENCE_LIMIT_EXCEEDED' as const

  constructor(message = 'This dispute already has the maximum number of evidence files') {
    super(message)
    this.name = 'DisputeEvidenceLimitExceededError'
  }
}
