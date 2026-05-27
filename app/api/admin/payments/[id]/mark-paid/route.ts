import { requireAuth } from '@/lib/session/getSession'
import { markManualPaymentPaid } from '@/features/payments/payment.service'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await markManualPaymentPaid(user, id)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('POST /api/admin/payments/[id]/mark-paid', error)
  }
}
