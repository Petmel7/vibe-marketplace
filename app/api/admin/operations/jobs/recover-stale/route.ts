import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { recoverStaleAdminOperationsJobs } from '@/features/admin/operations/admin-operations.service'
import { adminOperationsRecoverStaleSchema } from '@/features/admin/operations/admin-operations.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

async function parseBody(request: Request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = adminOperationsRecoverStaleSchema.parse(await parseBody(request))
    const data = await recoverStaleAdminOperationsJobs(user, body)
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

    return toErrorResponse('POST /api/admin/operations/jobs/recover-stale', error)
  }
}
