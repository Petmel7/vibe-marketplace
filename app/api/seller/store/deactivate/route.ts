import { requireAuth } from '@/lib/session/getSession'
import { deactivateStore } from '@/features/store/store.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/store/deactivate
 * Deactivates the authenticated seller's store.
 */
export async function POST(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await deactivateStore(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/store/deactivate', err)
  }
}
