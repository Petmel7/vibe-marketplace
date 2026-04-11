'use client'

import Image from 'next/image'
import { Trash } from 'lucide-react'
import type { CartItemDto } from '@/features/cart/cart.dto'

interface CartItemProps {
  item: CartItemDto
  onUpdateQuantity: (itemId: string, newQuantity: number) => void
  onRemove: (itemId: string) => void
  isLoading: boolean
}

function fmt(value: string) {
  return Number(value).toLocaleString('uk-UA')
}

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="shrink-0 w-33 h-33 rounded-xl overflow-hidden bg-[#2A323F] flex items-center justify-center">
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={132}
          height={132}
          className="object-contain w-full h-full p-2"
        />
      ) : (
        <span className="text-[#A5A8AD] text-xs">Немає фото</span>
      )}
    </div>
  )
}

interface QtyControlsProps {
  quantity: number
  maxQuantity: number
  isLoading: boolean
  onDecrement: () => void
  onIncrement: () => void
}

function QuantityControls({
  quantity,
  maxQuantity,
  isLoading,
  onDecrement,
  onIncrement,
}: QtyControlsProps) {
  return (
    <div className="flex items-center justify-between w-29 h-8 rounded-2xl px-1.5 py-1 bg-[#333A47]">
      <button
        aria-label="Зменшити кількість"
        onClick={onDecrement}
        disabled={isLoading || quantity <= 1}
        className="w-6 h-6 flex items-center justify-center text-white text-base leading-none disabled:opacity-40"
      >
        −
      </button>
      <span className="text-white text-sm font-medium min-w-4 text-center tabular-nums">
        {quantity}
      </span>
      <button
        aria-label="Збільшити кількість"
        onClick={onIncrement}
        disabled={isLoading || quantity >= maxQuantity}
        className="w-6 h-6 flex items-center justify-center text-white text-base leading-none disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      aria-label="Видалити товар"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center disabled:opacity-40"
    >
      <Trash width={16} height={18} color="#A5A8AD" aria-hidden="true" />
    </button>
  )
}

export default function CartItem({ item, onUpdateQuantity, onRemove, isLoading }: CartItemProps) {
  const { variant } = item

  const variantParts: string[] = []
  if (variant.size) variantParts.push(`Розмір: ${variant.size}`)
  if (variant.color) variantParts.push(variant.color)
  const variantLabel = variantParts.join(' · ')

  return (
    <article className="py-4 border-b border-white/10">
      {/* ─── Mobile layout (default, hidden on md+) ─── */}
      <div className="flex gap-3 md:hidden">
        <ProductImage src={variant.product.imageUrl} alt={variant.product.name} />

        <div className="flex flex-col flex-1 gap-1 min-w-0">
          <p className="font-bold text-[14px] leading-5 text-[#E8E9EA] truncate">
            {variant.product.name}
          </p>

          {variantLabel && (
            <p className="text-[14px] leading-5 text-[#E8E9EA]">{variantLabel}</p>
          )}

          <div className="flex items-center justify-between mt-auto pt-2">
            <QuantityControls
              quantity={item.quantity}
              maxQuantity={variant.stock}
              isLoading={isLoading}
              onDecrement={() => onUpdateQuantity(item.id, item.quantity - 1)}
              onIncrement={() => onUpdateQuantity(item.id, item.quantity + 1)}
            />
            <div className="flex items-center gap-3">
              <span className="text-[13px] leading-5 text-[#E8E9EA]">
                {fmt(item.lineTotal)} ₴
              </span>
              <RemoveButton onClick={() => onRemove(item.id)} disabled={isLoading} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Desktop layout (hidden below md) ─── */}
      <div className="hidden md:flex items-center gap-6">
        <ProductImage src={variant.product.imageUrl} alt={variant.product.name} />

        {/* Product name */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] leading-5 text-[#E8E9EA] truncate">
            {variant.product.name}
          </p>
        </div>

        {/* Variant */}
        <div className="w-28 shrink-0">
          {variantLabel && (
            <p className="text-[14px] leading-5 text-[#E8E9EA]">{variantLabel}</p>
          )}
        </div>

        {/* Unit price */}
        <div className="w-24 shrink-0">
          <p className="text-[13px] leading-5 text-[#E8E9EA]">{fmt(item.unitPrice)} ₴</p>
          <p className="text-[11px] leading-4 text-[#A5A8AD]">Ціна за 1 шт.</p>
        </div>

        <QuantityControls
          quantity={item.quantity}
          maxQuantity={variant.stock}
          isLoading={isLoading}
          onDecrement={() => onUpdateQuantity(item.id, item.quantity - 1)}
          onIncrement={() => onUpdateQuantity(item.id, item.quantity + 1)}
        />

        {/* Line total */}
        <span className="w-20 text-right text-[13px] leading-5 text-[#E8E9EA] shrink-0 tabular-nums">
          {fmt(item.lineTotal)} ₴
        </span>

        <RemoveButton onClick={() => onRemove(item.id)} disabled={isLoading} />
      </div>
    </article>
  )
}
