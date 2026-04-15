import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { viewedRecordSchema } from '@/features/viewed/viewed.schema'
import {
  getRecentlyViewed,
  recordView,
  ProductNotFoundError,
  type ViewedIdentifier,
} from '@/features/viewed/viewed.service'

// ---------------------------------------------------------------------------
// Auth/identifier helper
// ---------------------------------------------------------------------------

function resolveIdentifier(request: NextRequest): ViewedIdentifier | null {
  const userId = request.headers.get('x-user-id')
  if (userId) return { userId }

  const sessionId = request.headers.get('x-session-id')
  if (sessionId) return { sessionId }

  return null
}

function identifierMissingResponse(): Response {
  return Response.json(
    {
      success: false,
      error: {
        message: 'Supply either an x-user-id header (authenticated) or an x-session-id header (guest)',
        code: 'MISSING_IDENTIFIER',
      },
    },
    { status: 400 },
  )
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
 *   x-user-id    — UUID of an authenticated user
 *   x-session-id — opaque string for a guest session
 *
 * Responses:
 *   200  { success: true,  data: { items: ViewedProductDto[] } }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const identifier = resolveIdentifier(request)
    if (!identifier) return identifierMissingResponse()

    const data = await getRecentlyViewed(identifier)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/viewed] Unexpected error:', error)
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
 *   x-user-id    — UUID of an authenticated user
 *   x-session-id — opaque string for a guest session
 *
 * Body: { productId: string (UUID) }
 *
 * Responses:
 *   200  { success: true,  data: { items: ViewedProductDto[] } }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' | 'VALIDATION_ERROR' } }
 *   404  { success: false, error: { message, code: 'NOT_FOUND' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const identifier = resolveIdentifier(request)
    if (!identifier) return identifierMissingResponse()

    const body = await request.json()
    const input = viewedRecordSchema.parse(body)

    const data = await recordView(identifier, input)
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

    console.error('[POST /api/viewed] Unexpected error:', error)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    )
  }
}
