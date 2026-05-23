import { requireAuth } from '@/lib/session/getSession'
import { getAdminBadgeRules } from '@/features/products/product-badge-rule.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await getAdminBadgeRules(user)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/admin/badge-rules', error)
  }
}
