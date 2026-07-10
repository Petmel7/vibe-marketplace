'use client'

import type { CheckoutPaymentMethod } from '@/types/payments'

const PAYMENT_METHOD_OPTIONS: Array<{
  value: CheckoutPaymentMethod
  label: string
  description: string
}> = [
  {
    value: 'CARD',
    label: 'Оплата карткою',
    description:
      'Онлайн-оплата. Після створення замовлення може знадобитися підтвердження у платіжного провайдера.',
  },
  {
    value: 'CASH_ON_DELIVERY',
    label: 'Післяплата',
    description:
      'Оплата під час отримання замовлення. Замовлення буде створене одразу, а оплата зафіксується пізніше.',
  },
]

export default function PaymentMethodSelector({
  value,
  onChange,
  disabled = false,
  errorMessage,
}: {
  value: CheckoutPaymentMethod
  onChange: (value: CheckoutPaymentMethod) => void
  disabled?: boolean
  errorMessage?: string | null
}) {
  const describedBy = errorMessage ? 'checkout-payment-method-error' : undefined

  return (
    <div className="ui-elevated-panel p-5 sm:p-6">
      <fieldset
        className="min-w-0 space-y-4"
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={describedBy}
        disabled={disabled}
      >
        <legend className="sr-only">Спосіб оплати</legend>

        <div className="space-y-4">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-copy-strong">Спосіб оплати</h2>
            <p className="text-sm text-copy-muted">
              Оберіть, як ви хочете завершити покупку. Підсумки та фінальна доступність товарів усе
              одно перевіряються на сервері.
            </p>
          </div>

          <div className="space-y-3">
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const checked = value === option.value

              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-4 transition-colors ${
                    checked
                      ? 'border-brand-accent bg-brand-accent/10'
                      : 'border-panelBorder bg-panel hover:bg-panel/70'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={option.value}
                    checked={checked}
                    onChange={() => onChange(option.value)}
                    className="mt-1 h-4 w-4 border-panelBorder text-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-copy-strong">{option.label}</span>
                    <span className="block text-sm text-copy-muted">{option.description}</span>
                  </span>
                </label>
              )
            })}
          </div>

          {errorMessage ? (
            <p
              id="checkout-payment-method-error"
              className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      </fieldset>
    </div>
  )
}
