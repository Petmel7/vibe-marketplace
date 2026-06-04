import EmailLayout from './components/EmailLayout'
import RefundEmailContent from './components/RefundEmailContent'
import type { RefundRejectedEmailPayload } from '../email.dto'

export default function RefundRejectedEmail(payload: RefundRejectedEmailPayload) {
  return (
    <EmailLayout previewText={`Refund request ${payload.refundRequestId} was rejected`}>
      <RefundEmailContent
        ctaLabel="Review refund decision"
        intro="Your refund request could not be approved. Please review the decision details below."
        payload={payload}
        title="Refund rejected"
      />
    </EmailLayout>
  )
}
