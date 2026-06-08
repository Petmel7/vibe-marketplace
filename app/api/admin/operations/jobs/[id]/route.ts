import { requireAuth } from '@/lib/session/getSession'
import { getAdminOperationsJobById } from '@/features/admin/operations/admin-operations.service'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await getAdminOperationsJobById(user, id)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/admin/operations/jobs/[id]', error)
  }
}
