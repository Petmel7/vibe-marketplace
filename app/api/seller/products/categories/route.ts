import { requireAuth } from '@/lib/session/getSession'
import { requireSeller } from '@/lib/auth/guards'
import { listSellerProductCategories } from '@/features/seller/products/seller-product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    requireSeller(user)
    const data = await listSellerProductCategories()
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/products/categories', err)
  }
}
