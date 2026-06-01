import EmailLayout from './components/EmailLayout'
import OrderEmailContent from './components/OrderEmailContent'
import type { SellerNewOrderEmailPayload } from '../email.dto'

export default function SellerNewOrderEmail(payload: SellerNewOrderEmailPayload) {
  return (
    <EmailLayout previewText={`A new paid order is ready for ${payload.storeName}`}>
      <OrderEmailContent
        ctaLabel="Open seller orders"
        intro="A paid marketplace order now needs fulfillment from your store."
        payload={payload}
        showBuyerEmail
        title="New paid order"
      />
    </EmailLayout>
  )
}
