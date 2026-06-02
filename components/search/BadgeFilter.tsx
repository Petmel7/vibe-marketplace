'use client'

import type { ProductSearchBadgeFacetDto } from '@/features/products/product.dto'

const BADGE_LABELS: Record<string, string> = {
  NEW: 'Новинка',
  HIT: 'Хіт',
  FEATURED: 'Рекомендуємо',
}

interface BadgeFilterProps {
  value: string | null
  options: ProductSearchBadgeFacetDto[]
  onChange: (value: string | null) => void
}

export default function BadgeFilter({
  value,
  options,
  onChange,
}: BadgeFilterProps) {
  if (options.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-copy-strong">Маркетплейс-бейджі</h3>

      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm text-copy-primary">
          <input
            type="radio"
            name="search-badge"
            checked={value === null}
            onChange={() => onChange(null)}
            className="h-4 w-4 border-panelBorder bg-panel text-brand focus:ring-brand"
          />
          <span>Усі товари</span>
        </label>

        {options.map((option) => (
          <label
            key={option.type}
            className="flex items-center gap-3 text-sm text-copy-primary"
          >
            <input
              type="radio"
              name="search-badge"
              checked={value === option.type}
              onChange={() => onChange(option.type)}
              className="h-4 w-4 border-panelBorder bg-panel text-brand focus:ring-brand"
            />
            <span>
              {BADGE_LABELS[option.type] ?? option.type} ({option.count})
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
