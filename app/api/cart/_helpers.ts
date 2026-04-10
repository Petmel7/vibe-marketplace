import { type NextRequest } from 'next/server'
import type { CartIdentifier } from '@/features/cart/cart.repository'

/**
 * Extract a CartIdentifier from request headers.
 *
 * Priority: x-user-id (authenticated) > x-session-id (guest).
 * Returns null when neither header is present.
 */
export function resolveCartIdentifier(
  request: NextRequest
): CartIdentifier | null {
  const userId = request.headers.get('x-user-id') ?? undefined
  const sessionId = request.headers.get('x-session-id') ?? undefined

  if (userId) return { userId }
  if (sessionId) return { sessionId }
  return null
}

export function identifierMissingResponse(): Response {
  return Response.json(
    {
      success: false,
      error: {
        message:
          'Supply either an x-user-id header (authenticated) or an x-session-id header (guest)',
        code: 'MISSING_IDENTIFIER',
      },
    },
    { status: 400 }
  )
}

export function notFoundResponse(message: string): Response {
  return Response.json(
    { success: false, error: { message, code: 'NOT_FOUND' } },
    { status: 404 }
  )
}

export function conflictResponse(message: string, code: string): Response {
  return Response.json(
    { success: false, error: { message, code } },
    { status: 409 }
  )
}

export function internalErrorResponse(label: string, error: unknown): Response {
  console.error(`[${label}] Unexpected error:`, error)
  return Response.json(
    { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
    { status: 500 }
  )
}
