import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { adminStoreOptionQuerySchema } from '@/features/admin/oversight/admin-oversight.schema'
import { getAdminStoreOptions } from '@/features/admin/oversight/admin-oversight.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/admin/stores/options
 *
 * Returns lightweight store selector options for admin-only forms.
 *
 * Query params: page, limit, q
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const parsed = adminStoreOptionQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: { message: 'Validation error', code: 'VALIDATION_ERROR' },
        },
        { status: 400 },
      )
    }

    const data = await getAdminStoreOptions(user, parsed.data)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (err) {
    return toErrorResponse('GET /api/admin/stores/options', err)
  }
}
