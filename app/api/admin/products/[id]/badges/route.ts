import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { createAdminBadgeOverride } from '@/features/products/product-badge.service'
import { adminCreateProductBadgeSchema, productIdParamSchema } from '@/features/products/product-badge.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = productIdParamSchema.parse(await params)
    const body = await request.json()
    const parsed = adminCreateProductBadgeSchema.parse(body)

    const data = await createAdminBadgeOverride(user, id, parsed)
    return Response.json({ success: true, data }, { status: 201 })
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

    return toErrorResponse('POST /api/admin/products/[id]/badges', error)
  }
}
