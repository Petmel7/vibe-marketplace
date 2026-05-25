import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { createSellerProductSchema } from '@/features/seller/products/seller-product.schema'
import { getMyProducts, createProduct } from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/seller/products
 * Returns paginated list of the seller's products.
 * Query params: status, page, limit
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const filters = {
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
    }
    const data = await getMyProducts(user, filters)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/products', err)
  }
}

/**
 * POST /api/seller/products
 * Creates a new product under the seller's store (status: PENDING_REVIEW).
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = createSellerProductSchema.safeParse(body)
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
    const data = await createProduct(user, parsed.data)
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return toErrorResponse('POST /api/seller/products', err)
  }
}
