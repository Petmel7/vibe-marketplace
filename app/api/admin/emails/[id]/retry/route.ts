import { requireAuth } from '@/lib/session/getSession'
import { retryEmailEvent } from '@/features/email/email.service'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await retryEmailEvent(user, id)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('POST /api/admin/emails/[id]/retry', error)
  }
}
