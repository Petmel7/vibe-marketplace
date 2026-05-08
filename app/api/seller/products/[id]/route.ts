import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { updateSellerProductSchema } from '@/features/seller/products/seller-product.schema'
import {
  getMyProductById,
  updateProduct,
  archiveProduct,
} from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/seller/products/[id]
 * Returns a single product by ID (must belong to seller's store).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await getMyProductById(user, id)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/products/[id]', err)
  }
}

/**
 * PATCH /api/seller/products/[id]
 * Updates a product (name, description, price, etc.).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const parsed = updateSellerProductSchema.safeParse(body)
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
    const data = await updateProduct(user, id, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/seller/products/[id]', err)
  }
}

/**
 * DELETE /api/seller/products/[id]
 * Soft-deletes (archives) a product.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await archiveProduct(user, id)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('DELETE /api/seller/products/[id]', err)
  }
}
