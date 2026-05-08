import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { archiveProduct } from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/products/[id]/archive
 * Archives a PUBLISHED or REJECTED product.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await archiveProduct(user, id)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/products/[id]/archive', err)
  }
}
