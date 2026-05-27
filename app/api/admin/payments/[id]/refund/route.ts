import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { refundPaymentByAdmin } from '@/features/payments/payment.service'
import { adminRefundPaymentSchema } from '@/features/payments/payment.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const parsed = adminRefundPaymentSchema.parse(body)
    const { id } = await params
    const data = await refundPaymentByAdmin(user, id, parsed)

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

    return toErrorResponse('POST /api/admin/payments/[id]/refund', error)
  }
}
