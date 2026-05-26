export default function CheckoutSubmitButton({
  disabled,
  isSubmitting,
  onSubmit,
}: {
  disabled: boolean
  isSubmitting: boolean
  onSubmit: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={disabled || isSubmitting}
      className="ui-primary-button w-full disabled:cursor-not-allowed disabled:opacity-60"
      aria-disabled={disabled || isSubmitting}
    >
      {isSubmitting ? 'Placing order...' : 'Place order'}
    </button>
  )
}
