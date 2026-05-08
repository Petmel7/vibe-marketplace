import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { updateVariantSchema } from '@/features/seller/products/seller-product.schema'
import {
  updateVariant,
  removeVariant,
} from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * PATCH /api/seller/products/[id]/variants/[variantId]
 * Updates a specific variant.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { variantId } = await params
    const body = await request.json()
    const parsed = updateVariantSchema.safeParse(body)
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
    const data = await updateVariant(user, variantId, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/seller/products/[id]/variants/[variantId]', err)
  }
}

/**
 * DELETE /api/seller/products/[id]/variants/[variantId]
 * Removes a specific variant permanently.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { variantId } = await params
    await removeVariant(user, variantId)
    return Response.json({ success: true, data: null })
  } catch (err) {
    return toErrorResponse('DELETE /api/seller/products/[id]/variants/[variantId]', err)
  }
}
