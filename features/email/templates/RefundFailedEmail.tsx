import EmailLayout from './components/EmailLayout'
import RefundEmailContent from './components/RefundEmailContent'
import type { RefundFailedEmailPayload } from '../email.dto'

export default function RefundFailedEmail(payload: RefundFailedEmailPayload) {
  return (
    <EmailLayout previewText={`Refund request ${payload.refundRequestId} needs attention`}>
      <RefundEmailContent
        ctaLabel="Open refund request"
        intro="The refund could not be completed. Please review the latest status and next steps."
        payload={payload}
        title="Refund failed"
      />
    </EmailLayout>
  )
}
