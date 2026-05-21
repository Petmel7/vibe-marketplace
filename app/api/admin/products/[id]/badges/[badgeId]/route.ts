import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { deleteAdminBadgeOverride } from '@/features/products/product-badge.service'
import { badgeIdParamSchema, productIdParamSchema } from '@/features/products/product-badge.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; badgeId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const resolvedParams = await params
    const { id } = productIdParamSchema.parse({ id: resolvedParams.id })
    const { badgeId } = badgeIdParamSchema.parse({ badgeId: resolvedParams.badgeId })

    await deleteAdminBadgeOverride(user, id, badgeId)
    return Response.json({ success: true, data: { deleted: true } }, { status: 200 })
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

    return toErrorResponse('DELETE /api/admin/products/[id]/badges/[badgeId]', error)
  }
}
