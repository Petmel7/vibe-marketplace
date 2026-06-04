import EmailLayout from './components/EmailLayout'
import RefundEmailContent from './components/RefundEmailContent'
import type { RefundApprovedEmailPayload } from '../email.dto'

export default function RefundApprovedEmail(payload: RefundApprovedEmailPayload) {
  return (
    <EmailLayout previewText={`Refund request ${payload.refundRequestId} was approved`}>
      <RefundEmailContent
        ctaLabel="View refund request"
        intro="Your refund request was approved and will move into manual processing."
        payload={payload}
        title="Refund approved"
      />
    </EmailLayout>
  )
}
