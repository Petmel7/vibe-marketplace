import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { userOversightFilterSchema } from '@/features/admin/oversight/admin-oversight.schema'
import { getAllUsers } from '@/features/admin/oversight/admin-oversight.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { logInfo } from '@/utils/logger'

/**
 * GET /api/admin/users
 *
 * Returns all users with roles and profile info (admin only), paginated.
 *
 * Query params: page, limit, search, role
 *
 * Responses:
 *   200  { success: true, data: { items: AdminUserDto[], total, page, limit } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    logInfo('admin-users:route:start', {
      domain: 'admin-users',
      method: 'GET',
    })
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const parsed = userOversightFilterSchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: { message: 'Validation error', code: 'VALIDATION_ERROR' },
        },
        { status: 400 },
      )
    }
    logInfo('admin-users:route:before-service', {
      domain: 'admin-users',
      adminId: user.id,
      page: parsed.data.page,
      limit: parsed.data.limit,
      role: parsed.data.role ?? null,
      hasSearch: Boolean(parsed.data.search?.trim()),
    })
    const data = await getAllUsers(user, parsed.data)
    logInfo('admin-users:route:after-service', {
      domain: 'admin-users',
      adminId: user.id,
      itemCount: data.items.length,
      total: data.total,
    })
    const response = Response.json({ success: true, data })
    logInfo('admin-users:route:response-built', {
      domain: 'admin-users',
      adminId: user.id,
      itemCount: data.items.length,
      total: data.total,
    })
    return response
  } catch (err) {
    return toErrorResponse('GET /api/admin/users', err)
  }
}
