'use client'

import type { ProductVariantDto } from '@/features/products/product.dto'
import CollapsibleSection from './CollapsibleSection'

interface Props {
  variants: ProductVariantDto[]
  sku: string | null
}

export default function ProductCharacteristics({ variants, sku }: Props) {
  const colors = [...new Set(variants.map((v) => v.color).filter((c): c is string => c !== null))]
  const sizes = [...new Set(variants.map((v) => v.size).filter((s): s is string => s !== null))]

  return (
    <CollapsibleSection title="Характеристики товару">
      <div className="mt-3 flex flex-col gap-2">
        {sku && (
          <div className="flex justify-between gap-4">
            <span className="text-[14px] text-[#A5A8AD]">Артикул</span>
            <span className="text-[14px] text-[#E8E9EA]">{sku}</span>
          </div>
        )}
        {colors.length > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-[14px] text-[#A5A8AD]">Колір</span>
            <span className="text-[14px] text-[#E8E9EA]">{colors.join(', ')}</span>
          </div>
        )}
        {sizes.length > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-[14px] text-[#A5A8AD]">Розмір</span>
            <span className="text-[14px] text-[#E8E9EA]">{sizes.join(', ')}</span>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
