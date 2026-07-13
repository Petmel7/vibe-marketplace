'use client'

import type { SearchSortOption } from '@/types/search'

interface SearchSortSelectProps {
  value: string
  options: SearchSortOption[]
  onChange: (value: string) => void
}

export default function SearchSortSelect({
  value,
  options,
  onChange,
}: SearchSortSelectProps) {
  return (
    <label className="flex items-center gap-3 text-sm text-copy-secondary">
      <span className="shrink-0">Сортувати:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ui-native-select rounded-full border border-panelBorder bg-panel px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
        aria-label="Сортування результатів"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
