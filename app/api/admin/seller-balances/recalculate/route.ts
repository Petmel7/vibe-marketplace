import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { recalculateSellerBalancesSchema } from '@/features/payouts/payouts.schema'
import { recalculateSellerBalances } from '@/features/payouts/payouts.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = recalculateSellerBalancesSchema.parse(await request.json())
    const data = await recalculateSellerBalances(user, body)

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

    return toErrorResponse('POST /api/admin/seller-balances/recalculate', error)
  }
}
