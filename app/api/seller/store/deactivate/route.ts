import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { sellerStoreContextQuerySchema } from '@/features/store/store.schema'
import { deactivateStore } from '@/features/store/store.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/store/deactivate
 * Deactivates the authenticated seller's store.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = sellerStoreContextQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )
    if (!query.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: query.error.flatten(),
          },
        },
        { status: 400 },
      )
    }
    const data = await deactivateStore(user, query.data.storeId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/store/deactivate', err)
  }
}
