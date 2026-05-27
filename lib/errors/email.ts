export class EmailProviderError extends Error {
  readonly code = 'EMAIL_PROVIDER_ERROR' as const

  constructor(message = 'Email provider request failed') {
    super(message)
    this.name = 'EmailProviderError'
  }
}

export class EmailTemplateRenderError extends Error {
  readonly code = 'EMAIL_TEMPLATE_RENDER_ERROR' as const

  constructor(message = 'Email template could not be rendered') {
    super(message)
    this.name = 'EmailTemplateRenderError'
  }
}

export class EmailEventNotFoundError extends Error {
  readonly code = 'EMAIL_EVENT_NOT_FOUND' as const

  constructor(message = 'Email event not found') {
    super(message)
    this.name = 'EmailEventNotFoundError'
  }
}

export class EmailDuplicateEventError extends Error {
  readonly code = 'EMAIL_DUPLICATE_EVENT' as const

  constructor(message = 'An email event with this dedupe key already exists') {
    super(message)
    this.name = 'EmailDuplicateEventError'
  }
}

export class EmailRetryLimitExceededError extends Error {
  readonly code = 'EMAIL_RETRY_LIMIT_EXCEEDED' as const

  constructor(message = 'Email event has exceeded its retry limit') {
    super(message)
    this.name = 'EmailRetryLimitExceededError'
  }
}
