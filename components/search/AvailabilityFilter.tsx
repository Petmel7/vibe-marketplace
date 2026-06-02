'use client'

interface AvailabilityFilterProps {
  checked: boolean
  inStockCount: number
  outOfStockCount: number
  onChange: (checked: boolean) => void
}

export default function AvailabilityFilter({
  checked,
  inStockCount,
  outOfStockCount,
  onChange,
}: AvailabilityFilterProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-copy-strong">Наявність</h3>
        <p className="mt-1 text-xs text-copy-muted">
          В наявності: {inStockCount} · Закінчився: {outOfStockCount}
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm text-copy-primary">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-panelBorder bg-panel text-brand focus:ring-brand"
        />
        <span>Показувати лише товари в наявності</span>
      </label>
    </section>
  )
}
