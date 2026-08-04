import { describe, expect, it } from 'vitest'
import { RateLimitExceededError } from '@/lib/errors/security'
import { DatabaseUnavailableError } from '@/lib/errors/database'
import { toErrorResponse } from '@/lib/errors/handleError'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors/app'
import { z } from 'zod'

describe('toErrorResponse', () => {
  it('does not expose raw unexpected errors', async () => {
    const response = toErrorResponse('test', new Error('database exploded'))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    })
  })

  it('returns retry metadata for rate limit errors', async () => {
    const response = toErrorResponse('test', new RateLimitExceededError(42))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    expect(body).toEqual({
      success: false,
      error: {
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    })
  })

  it('maps database availability failures to a safe 503 response', async () => {
    const response = toErrorResponse('test', new DatabaseUnavailableError())
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({
      success: false,
      error: {
        message: 'Database temporarily unavailable. Please try again.',
        code: 'DATABASE_UNAVAILABLE',
      },
    })
  })

  it('maps AppError subclasses using their public contract', async () => {
    const response = toErrorResponse('test', new NotFoundError('Missing thing', 'THING_NOT_FOUND'))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({
      success: false,
      error: {
        message: 'Missing thing',
        code: 'THING_NOT_FOUND',
      },
    })
  })

  it('includes AppError details only when explicitly provided', async () => {
    const response = toErrorResponse(
      'test',
      new ValidationError('Invalid product', 'INVALID_PRODUCT', { fields: ['name'] }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({
      success: false,
      error: {
        message: 'Invalid product',
        code: 'INVALID_PRODUCT',
        details: { fields: ['name'] },
      },
    })
  })

  it('maps Zod errors to the standard validation response', async () => {
    const schema = z.object({ id: z.uuid('Invalid id') })
    const result = schema.safeParse({ id: 'bad-id' })

    expect(result.success).toBe(false)

    if (!result.success) {
      const response = toErrorResponse('test', result.error)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body).toEqual({
        success: false,
        error: {
          message: 'Invalid id',
          code: 'VALIDATION_ERROR',
        },
      })
    }
  })

  it('maps known Prisma errors to safe public responses', async () => {
    const duplicateResponse = toErrorResponse('test', { code: 'P2002', meta: { target: ['sku'] } })
    const duplicateBody = await duplicateResponse.json()

    expect(duplicateResponse.status).toBe(409)
    expect(duplicateBody).toEqual({
      success: false,
      error: {
        message: 'A record with this value already exists',
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
      },
    })

    const notFoundResponse = toErrorResponse('test', { code: 'P2025' })
    const notFoundBody = await notFoundResponse.json()

    expect(notFoundResponse.status).toBe(404)
    expect(notFoundBody.error.code).toBe('RECORD_NOT_FOUND')
  })

  it('keeps legacy code/status domain errors compatible', async () => {
    class LegacyConflictError extends Error {
      readonly code = 'LEGACY_CONFLICT'
      readonly statusCode = 409
    }

    const response = toErrorResponse('test', new LegacyConflictError('Legacy conflict'))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({
      success: false,
      error: {
        message: 'Legacy conflict',
        code: 'LEGACY_CONFLICT',
      },
    })
  })

  it('maps explicit conflict AppErrors without exposing causes', async () => {
    const response = toErrorResponse(
      'test',
      new ConflictError('Duplicate SKU', 'SKU_CONFLICT', undefined, new Error('P2002 raw internals')),
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({
      success: false,
      error: {
        message: 'Duplicate SKU',
        code: 'SKU_CONFLICT',
      },
    })
  })
})
