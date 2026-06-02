'use client'

import type { ProductSearchRatingFacetDto } from '@/features/products/product.dto'

interface RatingFilterProps {
  value: string | null
  options: ProductSearchRatingFacetDto[]
  onChange: (value: string | null) => void
}

export default function RatingFilter({
  value,
  options,
  onChange,
}: RatingFilterProps) {
  if (options.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-copy-strong">Рейтинг</h3>

      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm text-copy-primary">
          <input
            type="radio"
            name="search-rating"
            checked={value === null}
            onChange={() => onChange(null)}
            className="h-4 w-4 border-panelBorder bg-panel text-brand focus:ring-brand"
          />
          <span>Будь-який рейтинг</span>
        </label>

        {options.map((option) => (
          <label
            key={option.minRating}
            className="flex items-center gap-3 text-sm text-copy-primary"
          >
            <input
              type="radio"
              name="search-rating"
              checked={value === String(option.minRating)}
              onChange={() => onChange(String(option.minRating))}
              className="h-4 w-4 border-panelBorder bg-panel text-brand focus:ring-brand"
            />
            <span>
              {option.minRating}★ і вище ({option.count})
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
