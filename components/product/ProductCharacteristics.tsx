'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { ProductVariantDto } from '@/features/products/product.dto'

interface Props {
  variants: ProductVariantDto[]
  sku: string | null
}

export default function ProductCharacteristics({ variants, sku }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const colors = [...new Set(variants.map((v) => v.color).filter((c): c is string => c !== null))]
  const sizes = [...new Set(variants.map((v) => v.size).filter((s): s is string => s !== null))]

  return (
    <div className="border-t border-[#333A47] pt-4">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full py-1"
        aria-expanded={isOpen}
      >
        <span className="font-normal text-[14px] text-[#A5A8AD]">Характеристики</span>
        {isOpen ? <X size={24} color="#A5A8AD" /> : <Plus size={24} color="#A5A8AD" />}
      </button>
      {isOpen && (
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
              <span className="text-[14px] text-[#A5A8AD]">Розміри</span>
              <span className="text-[14px] text-[#E8E9EA]">{sizes.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
