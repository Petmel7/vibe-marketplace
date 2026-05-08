import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { updateInventorySchema } from '@/features/seller/products/seller-product.schema'
import { updateInventory } from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * PATCH /api/seller/products/[id]/variants/[variantId]/inventory
 * Updates the stock level for a specific variant.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { variantId } = await params
    const body = await request.json()
    const parsed = updateInventorySchema.safeParse(body)
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
    const data = await updateInventory(user, variantId, parsed.data.stock)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse(
      'PATCH /api/seller/products/[id]/variants/[variantId]/inventory',
      err,
    )
  }
}
