import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { verifyBearerToken } from '@/lib/auth'
import { logError } from '@/lib/logger'
import { viewedRecordSchema } from '@/features/viewed/viewed.schema'
import {
  getRecentlyViewed,
  recordView,
  ProductNotFoundError,
  type ViewedIdentifier,
} from '@/features/viewed/viewed.service'

// ---------------------------------------------------------------------------
// Identifier resolution (auth user OR guest session)
// ---------------------------------------------------------------------------

type IdentifierResult =
  | { ok: true; identifier: ViewedIdentifier }
  | { ok: false; response: Response }

/**
 * Resolve a ViewedIdentifier from the request.
 *
 * Priority:
 *   1. Authorization: Bearer <token>  — verified via Supabase Admin; yields userId
 *   2. x-session-id header            — guest session passthrough
 */
async function resolveIdentifier(request: NextRequest): Promise<IdentifierResult> {
  const authHeader = request.headers.get('Authorization')

  if (authHeader) {
    const auth = await verifyBearerToken(request)
    if (!auth.ok) return { ok: false, response: auth.response }
    return { ok: true, identifier: { userId: auth.userId } }
  }

  const sessionId = request.headers.get('x-session-id')
  if (sessionId) return { ok: true, identifier: { sessionId } }

  return {
    ok: false,
    response: Response.json(
      {
        success: false,
        error: {
          message:
            'Supply either an Authorization: Bearer token (authenticated) or an x-session-id header (guest)',
          code: 'MISSING_IDENTIFIER',
        },
      },
      { status: 400 },
    ),
  }
}

// ---------------------------------------------------------------------------
// GET /api/viewed
// ---------------------------------------------------------------------------

/**
 * GET /api/viewed
 *
 * Return the recently viewed product list (newest first, up to 20 items).
 *
 * Headers — one required:
 *   Authorization: Bearer <token>  — authenticated user
 *   x-session-id                   — opaque string for a guest session
 *
 * Responses:
 *   200  { success: true,  data: { items: ViewedProductDto[] } }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const result = await resolveIdentifier(request)
    if (!result.ok) return result.response

    const data = await getRecentlyViewed(result.identifier)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    logError('GET /api/viewed', error)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/viewed
// ---------------------------------------------------------------------------

/**
 * POST /api/viewed
 *
 * Record a product view. If the product was already viewed it is moved to
 * the top of the list; otherwise it is prepended (capped at 20 items).
 *
 * Headers — one required:
 *   Authorization: Bearer <token>  — authenticated user
 *   x-session-id                   — opaque string for a guest session
 *
 * Body: { productId: string (UUID) }
 *
 * Responses:
 *   200  { success: true,  data: { items: ViewedProductDto[] } }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' | 'VALIDATION_ERROR' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   404  { success: false, error: { message, code: 'NOT_FOUND' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const result = await resolveIdentifier(request)
    if (!result.ok) return result.response

    const body = await request.json()
    const input = viewedRecordSchema.parse(body)

    const data = await recordView(result.identifier, input)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.issues.map((e) => e.message).join('; '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    if (error instanceof ProductNotFoundError) {
      return Response.json(
        { success: false, error: { message: error.message, code: error.code } },
        { status: 404 },
      )
    }

    logError('POST /api/viewed', error)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    )
  }
}
