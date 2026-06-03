import type { AppliedPromotion } from '@/types/promotions'
import { formatPrice } from '@/utils/formatters/price'

export default function AppliedCouponCard({
  promotion,
  onRemove,
  removable = false,
  disabled = false,
}: {
  promotion: AppliedPromotion
  onRemove?: () => void
  removable?: boolean
  disabled?: boolean
}) {
  const isAutomatic = promotion.type === 'AUTOMATIC_DISCOUNT'

  return (
    <div className="rounded-2xl border border-brand-accent/25 bg-brand-accent/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-copy-muted">
            {isAutomatic ? 'Automatic discount' : 'Applied coupon'}
          </p>
          <h3 className="text-base font-semibold text-copy-strong">
            {promotion.code}
          </h3>
          <p className="text-sm text-copy-secondary">{promotion.name}</p>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-base font-semibold text-copy-strong">
            -{formatPrice(promotion.discountAmount)}
          </p>
          {removable && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="ui-secondary-button whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove coupon
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
