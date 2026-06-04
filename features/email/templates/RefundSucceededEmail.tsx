import EmailLayout from './components/EmailLayout'
import RefundEmailContent from './components/RefundEmailContent'
import type { RefundSucceededEmailPayload } from '../email.dto'

export default function RefundSucceededEmail(payload: RefundSucceededEmailPayload) {
  return (
    <EmailLayout previewText={`Refund request ${payload.refundRequestId} was completed`}>
      <RefundEmailContent
        ctaLabel="Open refund details"
        intro="The refund was marked as completed by marketplace support."
        payload={payload}
        title="Refund completed"
      />
    </EmailLayout>
  )
}
