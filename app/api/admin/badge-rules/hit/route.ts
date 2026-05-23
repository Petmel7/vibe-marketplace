import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { updateHitBadgeRule } from '@/features/products/product-badge-rule.service'
import { updateHitBadgeRuleSchema } from '@/features/products/product-badge.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = updateHitBadgeRuleSchema.parse(body)

    const data = await updateHitBadgeRule(user, parsed)
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

    return toErrorResponse('PATCH /api/admin/badge-rules/hit', error)
  }
}
