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
        <p className="font-normal text-[14px] leading-5 text-[#A5A8AD]">
          Колір:{' '}
          <span className="text-[#F1F3F5]">{colors.join(', ')}</span>
        </p>
      )}

      {sizeVariants.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-normal text-[14px] leading-5 text-[#A5A8AD]">Розмір</span>
            <a href="#" className="text-[14px] text-[#16D9A6] hover:underline">
              Таблиця розмірів
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizeVariants.map((variant) => {
              const isSelected = variant.id === selectedVariantId
              const isOutOfStock = variant.stock === 0
              return (
                <button
                  key={variant.id}
                  onClick={() => !isOutOfStock && onSelect(variant.id)}
                  disabled={isOutOfStock}
                  className={[
                    'min-w-14.75 h-8 rounded-3xl px-3',
                    'font-normal text-[14px] leading-5 text-white transition-colors',
                    isSelected
                      ? 'bg-[#9466FF]'
                      : isOutOfStock
                        ? 'bg-[#1D2533] text-[#A5A8AD] cursor-not-allowed line-through'
                        : 'bg-[#333A47] hover:bg-[#3F4A5A]',
                  ].join(' ')}
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
