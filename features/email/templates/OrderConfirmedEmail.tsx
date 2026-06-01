import EmailLayout from './components/EmailLayout'
import OrderEmailContent from './components/OrderEmailContent'
import type { OrderConfirmedEmailPayload } from '../email.dto'

export default function OrderConfirmedEmail(payload: OrderConfirmedEmailPayload) {
  return (
    <EmailLayout previewText={`Order ${payload.orderId} was confirmed`}>
      <OrderEmailContent
        ctaLabel="Open your order"
        intro="Your order has been confirmed and is ready for the next fulfillment step."
        payload={payload}
        title="Your order is confirmed"
      />
    </EmailLayout>
  )
}
