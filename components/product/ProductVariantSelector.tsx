'use client'

import type { ProductVariantDto } from '@/features/products/product.dto'

interface Props {
  variants: ProductVariantDto[]
  selectedVariantId: string | null
  onSelect: (variantId: string) => void
}

export default function ProductVariantSelector({ variants, selectedVariantId, onSelect }: Props) {
  const sizeVariants = variants.filter((v) => v.size)
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))]

  if (sizeVariants.length === 0 && colors.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {colors.length > 0 && (
        <p className="ui-body-muted">
          Колір: <span className="text-copy-strong">{colors.join(', ')}</span>
        </p>
      )}

      {sizeVariants.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="ui-body-muted">Розмір</span>
            <a href="#" className="ui-action-link">
              Таблиця розмірів
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizeVariants.map((variant) => {
              const isSelected = variant.id === selectedVariantId
              const isOutOfStock = variant.stock === 0
              const chipClass = isSelected
                ? 'ui-filter-chip ui-filter-chip-selected'
                : isOutOfStock
                  ? 'ui-filter-chip ui-filter-chip-disabled'
                  : 'ui-filter-chip ui-filter-chip-default'

              return (
                <button
                  key={variant.id}
                  onClick={() => !isOutOfStock && onSelect(variant.id)}
                  disabled={isOutOfStock}
                  className={chipClass}
                >
                  {variant.size}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
