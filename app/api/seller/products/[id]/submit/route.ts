import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { submitForReview } from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/products/[id]/submit
 * Submits a DRAFT product for admin review (transitions to PENDING_REVIEW).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await submitForReview(user, id)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/products/[id]/submit', err)
  }
}
