import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { toErrorResponse } from '@/lib/errors/handleError'
import {
  categoryIdParamSchema,
  updateAdminCategorySchema,
} from '@/features/categories/category.schema'
import {
  deleteAdminCategory,
  updateAdminCategory,
} from '@/features/categories/category.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = categoryIdParamSchema.parse(await params)
    const body = await request.json()
    const parsed = updateAdminCategorySchema.parse(body)
    const data = await updateAdminCategory(user, id, parsed)
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

    return toErrorResponse('PATCH /api/admin/categories/[id]', error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = categoryIdParamSchema.parse(await params)
    const data = await deleteAdminCategory(user, id)
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

    return toErrorResponse('DELETE /api/admin/categories/[id]', error)
  }
}
