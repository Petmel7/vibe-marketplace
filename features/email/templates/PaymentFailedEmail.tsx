import { Text } from '@react-email/components'
import EmailLayout from './components/EmailLayout'
import OrderEmailContent from './components/OrderEmailContent'
import type { PaymentFailedEmailPayload } from '../email.dto'

export default function PaymentFailedEmail(payload: PaymentFailedEmailPayload) {
  return (
    <EmailLayout previewText={`Payment for order ${payload.orderId} needs attention`}>
      <OrderEmailContent
        ctaLabel="Review your order"
        intro="We could not confirm your payment. Please review the order and try again if needed."
        payload={payload}
        title="Payment was not completed"
      />
      {payload.failureReason ? (
        <Text style={note}>Failure reason: {payload.failureReason}</Text>
      ) : null}
    </EmailLayout>
  )
}

const note = {
  color: '#fbcfe8',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '18px 0 0',
}
