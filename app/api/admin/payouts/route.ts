import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { adminPayoutQuerySchema, createAdminPayoutSchema } from '@/features/payouts/payouts.schema'
import { createAdminManualPayout, getAdminPayouts } from '@/features/payouts/payouts.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = adminPayoutQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )
    const data = await getAdminPayouts(user, query)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('GET /api/admin/payouts', error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = createAdminPayoutSchema.parse(await request.json())
    const data = await createAdminManualPayout(user, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'create',
      domain: 'payouts',
      targetId: data.id,
      targetType: 'payout',
      metadata: {
        storeId: data.storeId,
        sellerId: data.sellerId,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
      },
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/admin/payouts', error)
  }
}
