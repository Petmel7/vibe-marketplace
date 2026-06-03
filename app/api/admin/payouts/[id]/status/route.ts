import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { updatePayoutStatusSchema } from '@/features/payouts/payouts.schema'
import { updateAdminPayoutLifecycle } from '@/features/payouts/payouts.service'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = updatePayoutStatusSchema.parse(await request.json())
    const { id } = await params
    const data = await updateAdminPayoutLifecycle(user, id, body)

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

    return toErrorResponse('PATCH /api/admin/payouts/[id]/status', error)
  }
}
