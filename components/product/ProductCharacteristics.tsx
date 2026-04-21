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
            <span className="ui-body-muted">Артикул</span>
            <span className="ui-body-primary">{sku}</span>
          </div>
        )}
        {colors.length > 0 && (
          <div className="flex justify-between gap-4">
            <span className="ui-body-muted">Колір</span>
            <span className="ui-body-primary">{colors.join(', ')}</span>
          </div>
        )}
        {sizes.length > 0 && (
          <div className="flex justify-between gap-4">
            <span className="ui-body-muted">Розмір</span>
            <span className="ui-body-primary">{sizes.join(', ')}</span>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
