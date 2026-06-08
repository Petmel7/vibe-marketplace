import { ZodError } from 'zod'
import { processPaymentWebhook } from '@/features/payments/payment.service'
import { parsePaymentProviderParam } from '@/features/payments/webhooks/payment-webhook'
import { toErrorResponse } from '@/lib/errors/handleError'
import { assertRateLimit, rateLimitProfiles } from '@/lib/security/rate-limit'
import { validationErrorResponse } from '@/lib/http/validation'

interface Props {
  params: Promise<{ provider: string }>
}

export async function POST(request: Request, { params }: Props): Promise<Response> {
  try {
    const { provider: providerParam } = await params
    const provider = parsePaymentProviderParam(providerParam)
    assertRateLimit(request, rateLimitProfiles.paymentsWebhook, { resourceId: provider })
    const rawBody = await request.text()
    const headers = Object.fromEntries(request.headers.entries())

    const data = await processPaymentWebhook(provider, {
      headers,
      rawBody,
    })

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/payments/webhooks/[provider]', error)
  }
}
