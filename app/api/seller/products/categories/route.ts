import { requireAuth } from '@/lib/session/getSession'
import { requireSeller } from '@/lib/auth/guards'
import { getPublicCategoryTree } from '@/features/categories/category.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    requireSeller(user)
    const data = await getPublicCategoryTree()
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/products/categories', err)
  }
}
