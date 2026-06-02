export class AbuseReportNotFoundError extends Error {
  readonly code = 'ABUSE_REPORT_NOT_FOUND' as const

  constructor(message = 'Abuse report not found') {
    super(message)
    this.name = 'AbuseReportNotFoundError'
  }
}

export class AbuseReportTargetNotFoundError extends Error {
  readonly code = 'ABUSE_REPORT_TARGET_NOT_FOUND' as const

  constructor(message = 'The reported target could not be found') {
    super(message)
    this.name = 'AbuseReportTargetNotFoundError'
  }
}

export class DuplicateAbuseReportError extends Error {
  readonly code = 'DUPLICATE_ABUSE_REPORT' as const

  constructor(message = 'An active report for this target already exists') {
    super(message)
    this.name = 'DuplicateAbuseReportError'
  }
}

export class InvalidAbuseReportActionError extends Error {
  readonly code = 'INVALID_ABUSE_REPORT_ACTION' as const

  constructor(message = 'This abuse report action is invalid') {
    super(message)
    this.name = 'InvalidAbuseReportActionError'
  }
}

export class AbuseReportOwnershipError extends Error {
  readonly code = 'FORBIDDEN' as const

  constructor(message = 'You do not have access to this abuse report') {
    super(message)
    this.name = 'AbuseReportOwnershipError'
  }
}

export class AbuseReportModerationError extends Error {
  readonly code = 'ABUSE_REPORT_MODERATION_ERROR' as const

  constructor(message = 'The abuse report moderation action could not be completed') {
    super(message)
    this.name = 'AbuseReportModerationError'
  }
}

export class UnsupportedAbuseActionError extends Error {
  readonly code = 'UNSUPPORTED_ABUSE_ACTION' as const

  constructor(message = 'This moderation action is not supported for the selected target') {
    super(message)
    this.name = 'UnsupportedAbuseActionError'
  }
}
