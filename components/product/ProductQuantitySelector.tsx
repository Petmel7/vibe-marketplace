'use client'

interface Props {
  quantity: number
  onChange: (quantity: number) => void
  max?: number
}

export default function ProductQuantitySelector({ quantity, onChange, max = 99 }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="ui-body-muted">Кількість</span>
      <div className="ui-qty-control-md">
        <button
          onClick={() => onChange(Math.max(1, quantity - 1))}
          className="ui-qty-button-md"
          aria-label="Зменшити кількість"
        >
          -
        </button>
        <span className="select-none text-body-sm leading-5 text-white">{quantity}</span>
        <button
          onClick={() => onChange(Math.min(max, quantity + 1))}
          className="ui-qty-button-md"
          aria-label="Збільшити кількість"
        >
          +
        </button>
      </div>
    </div>
  )
}
