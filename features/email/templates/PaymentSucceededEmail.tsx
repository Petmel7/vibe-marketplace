import { Text } from '@react-email/components'
import EmailLayout from './components/EmailLayout'
import OrderEmailContent from './components/OrderEmailContent'
import type { PaymentSucceededEmailPayload } from '../email.dto'

export default function PaymentSucceededEmail(payload: PaymentSucceededEmailPayload) {
  return (
    <EmailLayout previewText={`Payment for order ${payload.orderId} was received`}>
      <OrderEmailContent
        ctaLabel="View payment details"
        intro="Your online payment was confirmed by the payment provider."
        payload={payload}
        title="Payment received"
      />
      <Text style={note}>
        Payment provider: {payload.paymentProvider}. Paid at: {payload.paidAt ?? 'Pending confirmation'}.
      </Text>
    </EmailLayout>
  )
}

const note = {
  color: '#b7c1cf',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '18px 0 0',
}
