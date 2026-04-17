'use client'

interface Props {
  quantity: number
  onChange: (quantity: number) => void
  max?: number
}

export default function ProductQuantitySelector({ quantity, onChange, max = 99 }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-normal text-[14px] text-[#A5A8AD]">Кількість</span>
      <div className="flex items-center justify-between w-full h-12 rounded-3xl px-4 py-3 bg-[#333A47]">
        <button
          onClick={() => onChange(Math.max(1, quantity - 1))}
          className="w-6 h-6 flex items-center justify-center text-white text-xl leading-none hover:text-[#16D9A6] transition-colors select-none"
          aria-label="Зменшити кількість"
        >
          −
        </button>
        <span className="text-white font-normal text-[14px] leading-5 select-none">{quantity}</span>
        <button
          onClick={() => onChange(Math.min(max, quantity + 1))}
          className="w-6 h-6 flex items-center justify-center text-white text-xl leading-none hover:text-[#16D9A6] transition-colors select-none"
          aria-label="Збільшити кількість"
        >
          +
        </button>
      </div>
    </div>
  )
}
