import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { createVariantSchema } from '@/features/seller/products/seller-product.schema'
import { addVariant } from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/products/[id]/variants
 * Adds a new variant to the product.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const parsed = createVariantSchema.safeParse(body)
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
    const data = await addVariant(user, id, parsed.data)
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return toErrorResponse('POST /api/seller/products/[id]/variants', err)
  }
}
