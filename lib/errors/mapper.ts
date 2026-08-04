import { ZodError } from 'zod'
import { AppError, AuthenticationError, InternalServerError, ValidationError } from './app'
import { mapPrismaError } from './prisma'

export type ApiErrorBody = {
  success: false
  error: {
    message: string
    code: string
    details?: unknown
  }
}

export type ApiErrorMapping = {
  body: ApiErrorBody
  status: number
  headers?: HeadersInit
  shouldLog: boolean
}

type LegacyDomainError = Error & {
  code?: unknown
  statusCode?: unknown
  details?: unknown
  retryAfterSeconds?: unknown
}

type SupabaseLikeError = {
  status?: unknown
  code?: unknown
  message?: unknown
}

const INTERNAL_ERROR_MESSAGE = 'An unexpected error occurred'
const INTERNAL_ERROR_CODE = 'INTERNAL_ERROR'

const EXPLICIT_LEGACY_STATUS_BY_CODE = new Map<string, number>([
  ['JOB_RUNNER_UNAUTHORIZED', 401],
  ['RATE_LIMIT_EXCEEDED', 429],
  ['DATABASE_UNAVAILABLE', 503],
  ['JOB_DEFINITION_NOT_FOUND', 500],
  ['NOVA_POSHTA_CREATE_SHIPMENT_ERROR', 422],
])

const CONFLICT_LEGACY_CODES = new Set([
  'CHECKOUT_STOCK_UNAVAILABLE',
  'CHECKOUT_PRICE_CHANGED',
  'CHECKOUT_PRODUCT_UNAVAILABLE',
  'PRODUCT_BADGE_CONFLICT',
  'PROMOTION_DELETE_CONFLICT',
])

const INTERNAL_LEGACY_CODE_PARTS = [
  'PROVIDER_ERROR',
  'CONFIG_ERROR',
  'UPLOAD_FAILED',
  'CALCULATION_ERROR',
  'EXECUTION_ERROR',
  'RENDER_ERROR',
  'REVERSAL_ERROR',
  'SYNC_ERROR',
  'CREATION_ERROR',
  'TRACKING_ERROR',
  'CANCEL_SHIPMENT_ERROR',
  'AGGREGATION_ERROR',
]

const BAD_REQUEST_LEGACY_CODE_PARTS = [
  'INVALID',
  'REQUIRED',
  'MISMATCH',
  'SIGNATURE',
  'PAYLOAD',
  'UNSUPPORTED',
  'EXPIRED',
  'INACTIVE',
  'LIMIT_REACHED',
  'MINIMUM',
  'AMOUNT_EXCEEDED',
  'NOT_ELIGIBLE',
]

function buildBody(error: AppError): ApiErrorBody {
  return {
    success: false,
    error: {
      message: error.publicMessage,
      code: error.code,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  }
}

function mapAppError(error: AppError): ApiErrorMapping {
  const retryAfterSeconds = (error as { retryAfterSeconds?: unknown }).retryAfterSeconds

  return {
    body: buildBody(error),
    status: error.httpStatus,
    headers:
      error.code === 'RATE_LIMIT_EXCEEDED' && typeof retryAfterSeconds === 'number'
        ? { 'Retry-After': String(retryAfterSeconds) }
        : undefined,
    shouldLog: error.httpStatus >= 500,
  }
}

function mapZodError(error: ZodError): ApiErrorMapping {
  return mapAppError(
    new ValidationError(error.issues.map((issue) => issue.message).join('; ') || 'Validation error', 'VALIDATION_ERROR', undefined, error),
  )
}

function mapSupabaseError(error: unknown): AppError | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const { status, code, message } = error as SupabaseLikeError

  if (typeof status !== 'number' || status < 400 || typeof message !== 'string') {
    return null
  }

  if (status === 401) {
    return new AuthenticationError(message, typeof code === 'string' ? code : 'UNAUTHORIZED', undefined, error)
  }

  return new AppError({
    code: typeof code === 'string' ? code : 'SUPABASE_ERROR',
    httpStatus: status,
    publicMessage: status >= 500 ? INTERNAL_ERROR_MESSAGE : message,
    cause: error,
  })
}

function getLegacyStatus(code: string) {
  const explicitStatus = EXPLICIT_LEGACY_STATUS_BY_CODE.get(code)

  if (explicitStatus) {
    return explicitStatus
  }

  if (code === 'UNAUTHORIZED') {
    return 401
  }

  if (
    code === 'FORBIDDEN' ||
    code.includes('OWNERSHIP') ||
    code.includes('ACCESS_DENIED') ||
    code.startsWith('UNAUTHORIZED') ||
    code.includes('UNVERIFIED') ||
    code === 'SELLER_NOT_VERIFIED' ||
    code === 'STORE_PROVISIONING_REQUIRED'
  ) {
    return 403
  }

  if (code === 'NOT_FOUND' || code.endsWith('_NOT_FOUND') || code.includes('NOT_FOUND')) {
    return 404
  }

  if (
    CONFLICT_LEGACY_CODES.has(code) ||
    code.includes('CONFLICT') ||
    code.startsWith('DUPLICATE') ||
    code.includes('ALREADY')
  ) {
    return 409
  }

  if (INTERNAL_LEGACY_CODE_PARTS.some((part) => code.includes(part))) {
    return 500
  }

  if (BAD_REQUEST_LEGACY_CODE_PARTS.some((part) => code.includes(part))) {
    return 400
  }

  return null
}

function mapLegacyDomainError(error: unknown): ApiErrorMapping | null {
  if (!(error instanceof Error)) {
    return null
  }

  const legacy = error as LegacyDomainError
  const code = typeof legacy.code === 'string' ? legacy.code : null

  if (!code) {
    return null
  }

  const status = typeof legacy.statusCode === 'number' ? legacy.statusCode : getLegacyStatus(code)

  if (!status) {
    return null
  }

  return {
    body: {
      success: false,
      error: {
        message: error.message,
        code,
        ...(legacy.details === undefined ? {} : { details: legacy.details }),
      },
    },
    status,
    headers:
      code === 'RATE_LIMIT_EXCEEDED' && typeof legacy.retryAfterSeconds === 'number'
        ? { 'Retry-After': String(legacy.retryAfterSeconds) }
        : undefined,
    shouldLog: status >= 500,
  }
}

/**
 * Converts any backend error into the standard API error response model.
 *
 * Route handlers should use `toErrorResponse()` rather than duplicating error
 * status/message/code mapping locally.
 */
export function mapErrorToApiError(error: unknown): ApiErrorMapping {
  if (error instanceof AppError) {
    return mapAppError(error)
  }

  if (error instanceof ZodError) {
    return mapZodError(error)
  }

  const prismaError = mapPrismaError(error)
  if (prismaError) {
    return mapAppError(prismaError)
  }

  const supabaseError = mapSupabaseError(error)
  if (supabaseError) {
    return mapAppError(supabaseError)
  }

  const legacyError = mapLegacyDomainError(error)
  if (legacyError) {
    return legacyError
  }

  return mapAppError(new InternalServerError(INTERNAL_ERROR_MESSAGE, INTERNAL_ERROR_CODE, undefined, error))
}
