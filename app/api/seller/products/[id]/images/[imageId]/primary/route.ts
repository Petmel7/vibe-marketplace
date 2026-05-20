import { requireAuth } from '@/lib/session/getSession'
import { setPrimaryProductImage } from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id, imageId } = await params
    const data = await setPrimaryProductImage(user, id, imageId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/seller/products/[id]/images/[imageId]/primary', err)
  }
}
