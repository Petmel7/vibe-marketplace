import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { toErrorResponse } from '@/lib/errors/handleError'
import { createAdminCategorySchema } from '@/features/categories/category.schema'
import { createAdminCategory, getAdminCategoryTree } from '@/features/categories/category.service'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await getAdminCategoryTree(user)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/admin/categories', error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = createAdminCategorySchema.parse(body)
    const data = await createAdminCategory(user, parsed)
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

    return toErrorResponse('POST /api/admin/categories', error)
  }
}
