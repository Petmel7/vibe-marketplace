import DashboardCard from '@/components/profile/DashboardCard'
import type { CheckoutPreview } from '@/types/checkout'
import type { CheckoutPaymentMethod } from '@/types/payments'
import { formatPrice } from '@/utils/formatters/price'
import { getPaymentMethodLabel } from './PaymentMethodBadge'

export default function CheckoutSummary({
  preview,
  paymentMethod,
}: {
  preview: CheckoutPreview
  paymentMethod: CheckoutPaymentMethod
}) {
  return (
    <DashboardCard
      title="Order summary"
      description="Totals are calculated on the server and rechecked again during order submission."
    >
      <dl className="space-y-3 text-sm text-copy-secondary">
        <div className="flex items-center justify-between gap-4">
          <dt>Items</dt>
          <dd className="text-copy-primary">{preview.itemCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Subtotal</dt>
          <dd className="text-copy-primary">{formatPrice(preview.subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Shipping</dt>
          <dd className="text-copy-primary">{formatPrice(preview.shippingAmount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Payment</dt>
          <dd className="text-copy-primary">{getPaymentMethodLabel(paymentMethod)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-panelBorder pt-3 text-base font-semibold text-copy-strong">
          <dt>Total</dt>
          <dd>{formatPrice(preview.total)}</dd>
        </div>
      </dl>
    </DashboardCard>
  )
}
