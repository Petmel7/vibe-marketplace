'use client'

interface ActiveFilterChip {
  key: string
  label: string
}

interface ActiveFiltersProps {
  filters: ActiveFilterChip[]
  onRemove: (key: string) => void
  onClearAll: () => void
}

export default function ActiveFilters({
  filters,
  onRemove,
  onClearAll,
}: ActiveFiltersProps) {
  if (filters.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onRemove(filter.key)}
          className="inline-flex items-center gap-2 rounded-full border border-panelBorder bg-panel px-3 py-1.5 text-sm text-copy-primary transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label={`Прибрати фільтр ${filter.label}`}
        >
          <span>{filter.label}</span>
          <span aria-hidden="true">×</span>
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-sm font-medium text-brand-accent transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Очистити фільтри
      </button>
    </div>
  )
}
