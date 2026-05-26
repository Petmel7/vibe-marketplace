'use client'

import Image from 'next/image'
import { Trash2 } from 'lucide-react'
import { getInventoryStatusChip } from '@/components/product/productInventory'
import type { CartItemDto } from '@/features/cart/cart.dto'
import { formatPrice } from '@/utils/formatters/price'

interface CartItemProps {
  item: CartItemDto
  onUpdateQuantity: (itemId: string, newQuantity: number) => void
  onRemove: (itemId: string) => void
  isLoading: boolean
}

function ProductImage({
  src,
  alt,
}: {
  src: string | null
  alt: string
}) {
  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-panelBorder bg-white">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain p-2"
          sizes="96px"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-copy-muted">
          Немає фото
        </div>
      )}
    </div>
  )
}

function QuantityControls({
  quantity,
  maxQuantity,
  isLoading,
  onDecrement,
  onIncrement,
}: {
  quantity: number
  maxQuantity: number
  isLoading: boolean
  onDecrement: () => void
  onIncrement: () => void
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-panelBorder bg-white px-3 py-2">
      <button
        type="button"
        aria-label="Зменшити кількість"
        onClick={onDecrement}
        disabled={isLoading || quantity <= 1}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-panelBorder text-sm font-semibold text-copy-primary transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-copy-strong">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Збільшити кількість"
        onClick={onIncrement}
        disabled={isLoading || quantity >= maxQuantity}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-panelBorder text-sm font-semibold text-copy-primary transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

function RemoveButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      aria-label="Видалити товар з кошика"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-panelBorder bg-white text-copy-muted transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 width={16} height={16} aria-hidden="true" />
    </button>
  )
}

function getVariantLabel(item: CartItemDto) {
  const parts: string[] = []

  if (item.variant.size) parts.push(`Розмір: ${item.variant.size}`)
  if (item.variant.color) parts.push(item.variant.color)

  return parts.join(' / ')
}

function getStockStatus(item: CartItemDto) {
  if (item.variant.stock <= 0) return 'OUT_OF_STOCK' as const
  if (item.variant.stock <= 3) return 'LOW_STOCK' as const
  return 'IN_STOCK' as const
}

function getStockWarning(item: CartItemDto) {
  if (item.variant.stock <= 0) {
    return 'Цей варіант зараз недоступний. Оновіть кошик або перейдіть до каталогу за альтернативами.'
  }

  if (item.quantity > item.variant.stock) {
    return `Доступно лише ${item.variant.stock} шт. Оновіть кількість перед переходом до оформлення.`
  }

  if (item.variant.stock <= 3) {
    return `Залишилося небагато: доступно ${item.variant.stock} шт.`
  }

  return null
}

export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  isLoading,
}: CartItemProps) {
  const variantLabel = getVariantLabel(item)
  const inventoryChip = getInventoryStatusChip(getStockStatus(item))
  const stockWarning = getStockWarning(item)

  return (
    <article className="rounded-2xl border border-panelBorder bg-panel px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ProductImage
          src={item.variant.product.imageUrl}
          alt={item.variant.product.name}
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h2 className="truncate text-base font-semibold text-copy-strong">
                {item.variant.product.name}
              </h2>
              <p className="text-sm text-copy-muted">
                {variantLabel || 'Стандартний варіант'}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-base font-semibold text-copy-strong">
                {formatPrice(item.lineTotal)}
              </p>
              <p className="mt-1 text-xs text-copy-muted">
                {formatPrice(item.unitPrice)} за 1 шт.
              </p>
            </div>
          </div>

          <dl className="grid gap-2 text-sm text-copy-secondary sm:grid-cols-3">
            <div>
              <dt className="text-copy-muted">Артикул</dt>
              <dd className="mt-1 text-copy-primary">{item.variant.sku}</dd>
            </div>
            <div>
              <dt className="text-copy-muted">У кошику</dt>
              <dd className="mt-1 text-copy-primary">{item.quantity}</dd>
            </div>
            <div>
              <dt className="text-copy-muted">Доступно</dt>
              <dd className="mt-1 text-copy-primary">{item.variant.stock}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {inventoryChip?.dotClassName ? (
                <span className={inventoryChip.className}>
                  <span className={inventoryChip.dotClassName} />
                  {inventoryChip.label}
                </span>
              ) : inventoryChip ? (
                <span className={inventoryChip.className}>{inventoryChip.label}</span>
              ) : null}

              <QuantityControls
                quantity={item.quantity}
                maxQuantity={Math.max(item.variant.stock, 1)}
                isLoading={isLoading}
                onDecrement={() => onUpdateQuantity(item.id, item.quantity - 1)}
                onIncrement={() => onUpdateQuantity(item.id, item.quantity + 1)}
              />
            </div>

            <RemoveButton
              onClick={() => onRemove(item.id)}
              disabled={isLoading}
            />
          </div>

          {stockWarning ? (
            <p
              className={`rounded-2xl px-4 py-3 text-sm ${
                item.variant.stock <= 0 || item.quantity > item.variant.stock
                  ? 'border border-brand-danger/30 bg-brand-danger/10 text-copy-primary'
                  : 'border border-amber-300/40 bg-amber-300/15 text-copy-primary'
              }`}
              aria-live="polite"
            >
              {stockWarning}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
