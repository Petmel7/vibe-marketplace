'use client'

import type { ProductSearchStoreFacetDto } from '@/features/products/product.dto'

interface StoreFilterProps {
  value: string | null
  options: ProductSearchStoreFacetDto[]
  onChange: (value: string | null) => void
}

export default function StoreFilter({
  value,
  options,
  onChange,
}: StoreFilterProps) {
  if (options.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-copy-strong">Магазини</h3>

      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm text-copy-primary">
          <input
            type="radio"
            name="search-store"
            checked={value === null}
            onChange={() => onChange(null)}
            className="h-4 w-4 border-panelBorder bg-panel text-brand focus:ring-brand"
          />
          <span>Усі магазини</span>
        </label>

        {options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-3 text-sm text-copy-primary"
          >
            <input
              type="radio"
              name="search-store"
              checked={value === option.slug || value === option.id}
              onChange={() => onChange(option.slug)}
              className="h-4 w-4 border-panelBorder bg-panel text-brand focus:ring-brand"
            />
            <span>
              {option.name} ({option.count})
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
