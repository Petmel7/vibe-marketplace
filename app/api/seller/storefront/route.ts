import { requireAuth } from '@/lib/session/getSession'
import { requireSeller } from '@/lib/auth/guards'
import { getOnboardingStatus } from '@/features/storefront/storefront.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/seller/storefront
 * Returns the authenticated seller's onboarding status including store state.
 */
export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    requireSeller(user)
    const data = await getOnboardingStatus(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/storefront', err)
  }
}
