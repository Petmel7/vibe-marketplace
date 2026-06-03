export class RiskProfileNotFoundError extends Error {
  readonly code = 'RISK_PROFILE_NOT_FOUND' as const

  constructor(message = 'Risk profile not found') {
    super(message)
    this.name = 'RiskProfileNotFoundError'
  }
}

export class RiskSubjectNotFoundError extends Error {
  readonly code = 'RISK_SUBJECT_NOT_FOUND' as const

  constructor(message = 'The requested risk subject could not be found') {
    super(message)
    this.name = 'RiskSubjectNotFoundError'
  }
}

export class RiskValidationError extends Error {
  readonly code = 'RISK_VALIDATION_ERROR' as const

  constructor(message = 'The risk scoring request is invalid') {
    super(message)
    this.name = 'RiskValidationError'
  }
}
