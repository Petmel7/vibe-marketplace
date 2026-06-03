import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { updatePromotionSchema } from '@/features/promotions/promotions.schema'
import {
  deleteAdminPromotion,
  getAdminPromotionById,
  updateAdminPromotion,
} from '@/features/promotions/promotions.service'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await getAdminPromotionById(user, id)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/admin/promotions/[id]', error)
  }
}

export async function PATCH(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = updatePromotionSchema.parse(await request.json())
    const { id } = await params
    const data = await updateAdminPromotion(user, id, body)

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

    return toErrorResponse('PATCH /api/admin/promotions/[id]', error)
  }
}

export async function DELETE(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    await deleteAdminPromotion(user, id)

    return Response.json({ success: true, data: null }, { status: 200 })
  } catch (error) {
    return toErrorResponse('DELETE /api/admin/promotions/[id]', error)
  }
}
