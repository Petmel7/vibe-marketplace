import EmailLayout from './components/EmailLayout'
import OrderEmailContent from './components/OrderEmailContent'
import type { OrderCreatedEmailPayload } from '../email.dto'

export default function OrderCreatedEmail(payload: OrderCreatedEmailPayload) {
  return (
    <EmailLayout previewText={`Order ${payload.orderId} was created`}>
      <OrderEmailContent
        ctaLabel="View order details"
        intro="We received your order and saved the latest order snapshot for checkout."
        payload={payload}
        title="Your order was created"
      />
    </EmailLayout>
  )
}
