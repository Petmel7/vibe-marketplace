import { requireAuth } from '@/lib/session/getSession'
import { removeProductImage } from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id, imageId } = await params
    await removeProductImage(user, id, imageId)
    return Response.json({ success: true, data: null })
  } catch (err) {
    return toErrorResponse('DELETE /api/seller/products/[id]/images/[imageId]', err)
  }
}
