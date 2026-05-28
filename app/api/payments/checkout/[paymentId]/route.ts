import { getHostedCheckoutHtml } from '@/features/payments/payment.service'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ paymentId: string }>
}

export async function GET(_: Request, { params }: Props): Promise<Response> {
  try {
    const { paymentId } = await params
    const html = await getHostedCheckoutHtml(paymentId)

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    return toErrorResponse('GET /api/payments/checkout/[paymentId]', error)
  }
}
