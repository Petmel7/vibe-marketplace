'use client'

import { useEffect, useState } from 'react'

interface PriceRangeFilterProps {
  minValue: string
  maxValue: string
  facetMin: string | null
  facetMax: string | null
  onApply: (values: { minPrice: string | null; maxPrice: string | null }) => void
}

export default function PriceRangeFilter({
  minValue,
  maxValue,
  facetMin,
  facetMax,
  onApply,
}: PriceRangeFilterProps) {
  const [draftMin, setDraftMin] = useState(minValue)
  const [draftMax, setDraftMax] = useState(maxValue)

  useEffect(() => {
    setDraftMin(minValue)
  }, [minValue])

  useEffect(() => {
    setDraftMax(maxValue)
  }, [maxValue])

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-copy-strong">Ціна</h3>
        {facetMin || facetMax ? (
          <p className="mt-1 text-xs text-copy-muted">
            Діапазон: {facetMin ?? '—'} - {facetMax ?? '—'} грн
          </p>
        ) : null}
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          onApply({
            minPrice: draftMin.trim() || null,
            maxPrice: draftMax.trim() || null,
          })
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-copy-muted">Від</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={draftMin}
              onChange={(event) => setDraftMin(event.target.value)}
              className="ui-surface-input"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-copy-muted">До</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={draftMax}
              onChange={(event) => setDraftMax(event.target.value)}
              className="ui-surface-input"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="ui-secondary-button h-10 px-5 text-sm">
            Застосувати
          </button>
          <button
            type="button"
            className="rounded-full px-4 text-sm text-copy-muted transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            onClick={() => {
              setDraftMin('')
              setDraftMax('')
              onApply({ minPrice: null, maxPrice: null })
            }}
          >
            Скинути
          </button>
        </div>
      </form>
    </section>
  )
}
