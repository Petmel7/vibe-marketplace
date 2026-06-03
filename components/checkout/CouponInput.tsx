'use client'

export default function CouponInput({
  value,
  onChange,
  onApply,
  disabled = false,
  isApplying = false,
  errorMessage,
  successMessage,
}: {
  value: string
  onChange: (value: string) => void
  onApply: () => void
  disabled?: boolean
  isApplying?: boolean
  errorMessage?: string | null
  successMessage?: string | null
}) {
  const messageId = errorMessage ? 'checkout-coupon-error' : successMessage ? 'checkout-coupon-success' : undefined

  return (
    <div className="space-y-3">
      <label className="block space-y-2" htmlFor="checkout-coupon-code">
        <span className="text-sm font-medium text-copy-strong">Coupon code</span>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="checkout-coupon-code"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter a coupon code"
            autoCapitalize="characters"
            className="ui-surface-input flex-1"
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={messageId}
            disabled={disabled || isApplying}
          />
          <button
            type="button"
            onClick={onApply}
            disabled={disabled || isApplying || value.trim().length === 0}
            className="ui-primary-button whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </label>

      {errorMessage ? (
        <p
          id="checkout-coupon-error"
          className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {!errorMessage && successMessage ? (
        <p
          id="checkout-coupon-success"
          className="rounded-2xl border border-brand-success/30 bg-brand-success/10 px-4 py-3 text-sm text-copy-primary"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}
    </div>
  )
}
