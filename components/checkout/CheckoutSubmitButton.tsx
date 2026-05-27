import type { CheckoutPaymentMethod } from '@/types/payments'

export default function CheckoutSubmitButton({
  disabled,
  isSubmitting,
  paymentMethod,
  onSubmit,
}: {
  disabled: boolean
  isSubmitting: boolean
  paymentMethod: CheckoutPaymentMethod
  onSubmit: () => void
}) {
  const idleLabel =
    paymentMethod === 'CARD' ? 'Перейти до оплати' : 'Підтвердити замовлення'
  const loadingLabel =
    paymentMethod === 'CARD' ? 'Готуємо оплату...' : 'Створюємо замовлення...'

  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={disabled || isSubmitting}
      className="ui-primary-button w-full disabled:cursor-not-allowed disabled:opacity-60"
      aria-disabled={disabled || isSubmitting}
    >
      {isSubmitting ? loadingLabel : idleLabel}
    </button>
  )
}
