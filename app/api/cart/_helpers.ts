import { type NextRequest } from 'next/server'
import { verifyBearerToken } from '@/lib/auth'
import { logError } from '@/lib/logger'
import type { CartIdentifier } from '@/features/cart/cart.repository'

// ---------------------------------------------------------------------------
// Identifier resolution
// ---------------------------------------------------------------------------

export type CartIdentifierResult =
  | { ok: true; identifier: CartIdentifier }
  | { ok: false; response: Response }

/**
 * Resolve a CartIdentifier from the incoming request.
 *
 * Priority:
 *   1. Authorization: Bearer <token>  — verified via Supabase Admin; yields userId
 *   2. x-session-id header            — guest session passthrough
 *
 * Returns { ok: false, response } with HTTP 401 when a Bearer token is present
 * but invalid, or HTTP 400 when neither identifier is supplied.
 */
export async function resolveCartIdentifier(
  request: NextRequest
): Promise<CartIdentifierResult> {
  const authHeader = request.headers.get('Authorization')

  if (authHeader) {
    const auth = await verifyBearerToken(request)
    if (!auth.ok) return { ok: false, response: auth.response }
    return { ok: true, identifier: { userId: auth.userId } }
  }

  const sessionId = request.headers.get('x-session-id') ?? undefined
  if (sessionId) return { ok: true, identifier: { sessionId } }

  return { ok: false, response: identifierMissingResponse() }
}

// ---------------------------------------------------------------------------
// Stock response helpers
// ---------------------------------------------------------------------------

export function identifierMissingResponse(): Response {
  return Response.json(
    {
      success: false,
      error: {
        message:
          'Supply either an Authorization: Bearer token (authenticated) or an x-session-id header (guest)',
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
  logError(label, error)
  return Response.json(
    { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
    { status: 500 }
  )
}
