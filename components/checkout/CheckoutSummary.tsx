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
      title="Підсумок замовлення"
      description="Підсумкові суми обчислюються на сервері та повторно перевіряються під час оформлення замовлення."
    >
      <dl className="space-y-3 text-sm text-copy-secondary">
        <div className="flex items-center justify-between gap-4">
          <dt>Товари</dt>
          <dd className="text-copy-primary">{preview.itemCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Сума товарів</dt>
          <dd className="text-copy-primary">{formatPrice(preview.subtotal)}</dd>
        </div>
        {Number(preview.discountAmount) > 0 ? (
          <div className="flex items-center justify-between gap-4">
            <dt>Знижка</dt>
            <dd className="text-copy-primary">-{formatPrice(preview.discountAmount)}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <dt>Доставка</dt>
          <dd className="text-copy-primary">{formatPrice(preview.shippingAmount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Оплата</dt>
          <dd className="text-copy-primary">{getPaymentMethodLabel(paymentMethod)}</dd>
        </div>
        {preview.appliedPromotion ? (
          <div className="flex items-center justify-between gap-4">
            <dt>Промокод</dt>
            <dd className="text-right text-copy-primary">
              <span className="block font-medium">{preview.appliedPromotion.code}</span>
              <span className="block text-xs text-copy-muted">{preview.appliedPromotion.name}</span>
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4 border-t border-panelBorder pt-3 text-base font-semibold text-copy-strong">
          <dt>Усього</dt>
          <dd>{formatPrice(preview.total)}</dd>
        </div>
      </dl>
    </DashboardCard>
  )
}
