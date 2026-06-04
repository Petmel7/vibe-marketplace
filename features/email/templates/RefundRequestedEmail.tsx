import EmailLayout from './components/EmailLayout'
import RefundEmailContent from './components/RefundEmailContent'
import type { RefundRequestedEmailPayload } from '../email.dto'

export default function RefundRequestedEmail(payload: RefundRequestedEmailPayload) {
  return (
    <EmailLayout previewText={`Refund request ${payload.refundRequestId} was created`}>
      <RefundEmailContent
        ctaLabel="Review refund request"
        intro="A refund request was created and is now waiting for review."
        payload={payload}
        title="Refund request created"
      />
    </EmailLayout>
  )
}
