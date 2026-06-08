import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { getAdminOperationsAuditLogs } from '@/features/admin/operations/admin-operations.service'
import { adminAuditLogQuerySchema } from '@/features/admin/operations/admin-operations.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = adminAuditLogQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const data = await getAdminOperationsAuditLogs(user, query)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.issues.map((issue) => issue.message).join('; '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    return toErrorResponse('GET /api/admin/operations/audit-logs', error)
  }
}
