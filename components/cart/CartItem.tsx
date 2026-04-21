'use client'

import Image from 'next/image'
import { Trash } from 'lucide-react'
import type { CartItemDto } from '@/features/cart/cart.dto'
import { formatPrice } from '@/lib/formatters/price'

interface CartItemProps {
  item: CartItemDto
  onUpdateQuantity: (itemId: string, newQuantity: number) => void
  onRemove: (itemId: string) => void
  isLoading: boolean
}

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="ui-thumb-frame ui-thumb-frame-md">
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={132}
          height={132}
          className="h-full w-full object-contain p-2"
        />
      ) : (
        <span className="text-xs text-copy-muted">Немає фото</span>
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
    <div className="ui-qty-control-compact">
      <button
        aria-label="Зменшити кількість"
        onClick={onDecrement}
        disabled={isLoading || quantity <= 1}
        className="ui-qty-button-compact"
      >
        -
      </button>
      <span className="min-w-4 text-center text-sm font-medium tabular-nums text-white">
        {quantity}
      </span>
      <button
        aria-label="Збільшити кількість"
        onClick={onIncrement}
        disabled={isLoading || quantity >= maxQuantity}
        className="ui-qty-button-compact"
      >
        +
      </button>
    </div>
  )
}

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      aria-label="Видалити товар з кошика"
      onClick={onClick}
      disabled={disabled}
      className="ui-icon-button disabled:opacity-40"
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
  const variantLabel = variantParts.join(' В· ')

  return (
    <article className="border-b border-panelBorder py-4">
      <div className="flex gap-3 md:hidden">
        <ProductImage src={variant.product.imageUrl} alt={variant.product.name} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-[14px] font-bold leading-5 text-copy-primary">
            {variant.product.name}
          </p>

          {variantLabel && <p className="ui-body-primary">{variantLabel}</p>}

          <div className="mt-auto flex items-center justify-between pt-2">
            <QuantityControls
              quantity={item.quantity}
              maxQuantity={variant.stock}
              isLoading={isLoading}
              onDecrement={() => onUpdateQuantity(item.id, item.quantity - 1)}
              onIncrement={() => onUpdateQuantity(item.id, item.quantity + 1)}
            />
            <div className="flex items-center gap-3">
              <span className="text-[13px] leading-5 text-copy-primary">
                {formatPrice(item.lineTotal)}
              </span>
              <RemoveButton onClick={() => onRemove(item.id)} disabled={isLoading} />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <ProductImage src={variant.product.imageUrl} alt={variant.product.name} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-5 text-copy-primary">
            {variant.product.name}
          </p>
        </div>

        <div className="w-28 shrink-0">
          {variantLabel && <p className="ui-body-primary">{variantLabel}</p>}
        </div>

        <div className="w-24 shrink-0">
          <p className="text-[13px] leading-5 text-copy-primary">{formatPrice(item.unitPrice)}</p>
          <p className="text-[11px] leading-4 text-copy-muted">Р¦С–РЅР° Р·Р° 1 С€С‚.</p>
        </div>

        <QuantityControls
          quantity={item.quantity}
          maxQuantity={variant.stock}
          isLoading={isLoading}
          onDecrement={() => onUpdateQuantity(item.id, item.quantity - 1)}
          onIncrement={() => onUpdateQuantity(item.id, item.quantity + 1)}
        />

        <span className="w-20 shrink-0 text-right text-[13px] leading-5 tabular-nums text-copy-primary">
          {formatPrice(item.lineTotal)}
        </span>

        <RemoveButton onClick={() => onRemove(item.id)} disabled={isLoading} />
      </div>
    </article>
  )
}
