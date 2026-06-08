import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { runDueAdminOperationsJobs } from '@/features/admin/operations/admin-operations.service'
import { adminOperationsRunDueSchema } from '@/features/admin/operations/admin-operations.schema'
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
    const body = adminOperationsRunDueSchema.parse(await parseBody(request))
    const data = await runDueAdminOperationsJobs(user, body)
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

    return toErrorResponse('POST /api/admin/operations/jobs/run-due', error)
  }
}
