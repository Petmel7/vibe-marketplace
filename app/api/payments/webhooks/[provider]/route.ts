import { ZodError } from 'zod'
import { processPaymentWebhook } from '@/features/payments/payment.service'
import { parsePaymentProviderParam } from '@/features/payments/webhooks/payment-webhook'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ provider: string }>
}

export async function POST(request: Request, { params }: Props): Promise<Response> {
  try {
    const { provider: providerParam } = await params
    const provider = parsePaymentProviderParam(providerParam)
    const rawBody = await request.text()
    const headers = Object.fromEntries(request.headers.entries())

    const data = await processPaymentWebhook(provider, {
      headers,
      rawBody,
    })

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

    return toErrorResponse('POST /api/payments/webhooks/[provider]', error)
  }
}
