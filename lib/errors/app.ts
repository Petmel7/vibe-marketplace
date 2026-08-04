export type AppErrorDetails = Record<string, unknown> | unknown[]

export type AppErrorOptions = {
  code: string
  httpStatus: number
  publicMessage: string
  details?: AppErrorDetails
  cause?: unknown
}

/**
 * Base class for expected backend failures that are safe to convert to API responses.
 *
 * Throw `AppError` subclasses from services when the failure is part of normal domain,
 * validation, authorization, upload, external-service, or persistence behavior.
 * Use plain `Error` only for unexpected programmer/runtime failures; the shared mapper
 * will log those and return a generic public response.
 */
export class AppError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly publicMessage: string
  readonly details?: AppErrorDetails
  override readonly cause?: unknown

  constructor(options: AppErrorOptions) {
    super(options.publicMessage)
    this.name = new.target.name
    this.code = options.code
    this.httpStatus = options.httpStatus
    this.publicMessage = options.publicMessage
    this.details = options.details
    this.cause = options.cause
  }
}

/**
 * Use for invalid request payloads/query params after they have crossed an API boundary.
 * Feature-specific validation errors may extend this class to keep domain-specific codes.
 */
export class ValidationError extends AppError {
  constructor(publicMessage = 'Validation error', code = 'VALIDATION_ERROR', details?: AppErrorDetails, cause?: unknown) {
    super({ code, httpStatus: 400, publicMessage, details, cause })
  }
}

export class AuthenticationError extends AppError {
  constructor(publicMessage = 'Unauthorized', code = 'UNAUTHORIZED', details?: AppErrorDetails, cause?: unknown) {
    super({ code, httpStatus: 401, publicMessage, details, cause })
  }
}

export class AuthorizationError extends AppError {
  constructor(publicMessage = 'Forbidden', code = 'FORBIDDEN', details?: AppErrorDetails, cause?: unknown) {
    super({ code, httpStatus: 403, publicMessage, details, cause })
  }
}

export class ForbiddenError extends AuthorizationError {}

export class NotFoundError extends AppError {
  constructor(publicMessage = 'Resource not found', code = 'NOT_FOUND', details?: AppErrorDetails, cause?: unknown) {
    super({ code, httpStatus: 404, publicMessage, details, cause })
  }
}

export class ConflictError extends AppError {
  constructor(publicMessage = 'Conflict', code = 'CONFLICT', details?: AppErrorDetails, cause?: unknown) {
    super({ code, httpStatus: 409, publicMessage, details, cause })
  }
}

export class UploadError extends AppError {
  constructor(publicMessage = 'Upload failed', code = 'UPLOAD_FAILED', details?: AppErrorDetails, cause?: unknown) {
    super({ code, httpStatus: 500, publicMessage, details, cause })
  }
}

export class ExternalServiceError extends AppError {
  constructor(publicMessage = 'External service is unavailable', code = 'EXTERNAL_SERVICE_ERROR', details?: AppErrorDetails, cause?: unknown) {
    super({ code, httpStatus: 500, publicMessage, details, cause })
  }
}

export class DatabaseError extends AppError {
  constructor(publicMessage = 'Database temporarily unavailable. Please try again.', code = 'DATABASE_ERROR', details?: AppErrorDetails, cause?: unknown) {
    super({ code, httpStatus: 503, publicMessage, details, cause })
  }
}

export class InternalServerError extends AppError {
  constructor(publicMessage = 'An unexpected error occurred', code = 'INTERNAL_ERROR', details?: AppErrorDetails, cause?: unknown) {
    super({ code, httpStatus: 500, publicMessage, details, cause })
  }
}
