import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { adminSellerBalanceQuerySchema } from '@/features/payouts/payouts.schema'
import { getAdminSellerBalances } from '@/features/payouts/payouts.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = adminSellerBalanceQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )
    const data = await getAdminSellerBalances(user, query)

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

    return toErrorResponse('GET /api/admin/seller-balances', error)
  }
}
