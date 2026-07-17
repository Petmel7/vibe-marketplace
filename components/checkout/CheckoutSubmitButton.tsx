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
      className="ui-primary-button mx-auto flex w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 min-[501px]:w-auto min-[501px]:min-w-[18rem] min-[501px]:max-w-[22rem]"
      aria-disabled={disabled || isSubmitting}
    >
      {isSubmitting ? loadingLabel : idleLabel}
    </button>
  )
}
