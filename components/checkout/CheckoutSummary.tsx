import DashboardCard from '@/components/profile/DashboardCard'
import type { CheckoutPreviewResponseDto } from '@/features/checkout/checkout.dto'
import { formatPrice } from '@/utils/formatters/price'

export default function CheckoutSummary({
  preview,
}: {
  preview: CheckoutPreviewResponseDto
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
        <div className="flex items-center justify-between gap-4 border-t border-panelBorder pt-3 text-base font-semibold text-copy-strong">
          <dt>Total</dt>
          <dd>{formatPrice(preview.total)}</dd>
        </div>
      </dl>
    </DashboardCard>
  )
}
