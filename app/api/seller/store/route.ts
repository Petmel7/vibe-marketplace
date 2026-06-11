import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import {
  sellerStoreContextQuerySchema,
  updateStoreSchema,
} from '@/features/store/store.schema'
import { getMyStore, updateMyStore } from '@/features/store/store.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/seller/store
 * Returns the authenticated seller's store.
 */
export async function GET(request: NextRequest): Promise<Response> {
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

    const data = await getMyStore(user, query.data.storeId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/store', err)
  }
}

/**
 * PATCH /api/seller/store
 * Updates the authenticated seller's store.
 */
export async function PATCH(request: NextRequest): Promise<Response> {
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
    const body = await request.json()
    const parsed = updateStoreSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }
    const data = await updateMyStore(user, parsed.data, query.data.storeId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/seller/store', err)
  }
}
