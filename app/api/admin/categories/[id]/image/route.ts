import { ZodError } from 'zod'
import { categoryIdParamSchema, removeCategoryImageSchema } from '@/features/categories/category.schema'
import {
  removeAdminCategoryImage,
  uploadAdminCategoryImage,
} from '@/features/categories/category.service'
import { requireAuth } from '@/lib/session/getSession'
import { toErrorResponse } from '@/lib/errors/handleError'

function validationErrorResponse(details: unknown) {
  return Response.json(
    {
      success: false,
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details,
      },
    },
    { status: 400 },
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = categoryIdParamSchema.parse(await params)
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return validationErrorResponse({ file: ['A valid file upload is required'] })
    }

    const data = await uploadAdminCategoryImage(user, id, file)
    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error.flatten())
    }

    return toErrorResponse('POST /api/admin/categories/[id]/image', error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = categoryIdParamSchema.parse(await params)
    const body = await request.json().catch(() => ({}))
    removeCategoryImageSchema.parse(body)
    const data = await removeAdminCategoryImage(user, id)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error.flatten())
    }

    return toErrorResponse('DELETE /api/admin/categories/[id]/image', error)
  }
}
