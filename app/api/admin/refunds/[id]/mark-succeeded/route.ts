import { ZodError } from 'zod'
import { adminRefundMutationNoteSchema } from '@/features/refunds/refunds.schema'
import { markAdminRefundRequestSucceeded } from '@/features/refunds/refunds.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const input = adminRefundMutationNoteSchema.parse(body)
    const { id } = await params
    const data = await markAdminRefundRequestSucceeded(user, id, input)
    await recordAdminAudit({
      actorId: user.id,
      action: 'mark-succeeded',
      domain: 'refunds',
      targetId: id,
      targetType: 'refund-request',
      metadata: input,
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/admin/refunds/[id]/mark-succeeded', error)
  }
}
