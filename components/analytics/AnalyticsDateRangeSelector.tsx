'use client'

import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters'
import {
  ANALYTICS_INTERVAL_VALUES,
  ANALYTICS_RANGE_VALUES,
  type AnalyticsUrlState,
} from '@/types/analytics'

const RANGE_LABELS: Record<(typeof ANALYTICS_RANGE_VALUES)[number], string> = {
  '7d': '7 днів',
  '30d': '30 днів',
  '90d': '90 днів',
  '12m': '12 місяців',
  custom: 'Власний період',
}

const INTERVAL_LABELS: Record<(typeof ANALYTICS_INTERVAL_VALUES)[number], string> = {
  day: 'День',
  week: 'Тиждень',
  month: 'Місяць',
}

export default function AnalyticsDateRangeSelector({
  filters,
}: {
  filters: AnalyticsUrlState
}) {
  const { draft, isPending, setRange, setInterval, setFrom, setTo, apply, reset } =
    useAnalyticsFilters()

  return (
    <section className="ui-elevated-panel p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-copy-strong">Період</span>
            <select
              className="w-full rounded-2xl border border-panelBorder bg-panel px-3 py-2 text-copy-strong"
              value={draft.range}
              onChange={(event) => setRange(event.target.value as AnalyticsUrlState['range'])}
            >
              {ANALYTICS_RANGE_VALUES.map((range) => (
                <option key={range} value={range}>
                  {RANGE_LABELS[range]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-copy-strong">Інтервал</span>
            <select
              className="w-full rounded-2xl border border-panelBorder bg-panel px-3 py-2 text-copy-strong"
              value={draft.interval}
              onChange={(event) => setInterval(event.target.value as AnalyticsUrlState['interval'])}
            >
              {ANALYTICS_INTERVAL_VALUES.map((interval) => (
                <option key={interval} value={interval}>
                  {INTERVAL_LABELS[interval]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {draft.range === 'custom' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-copy-strong">Від</span>
              <input
                type="date"
                className="w-full rounded-2xl border border-panelBorder bg-panel px-3 py-2 text-copy-strong"
                value={draft.from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-copy-strong">До</span>
              <input
                type="date"
                className="w-full rounded-2xl border border-panelBorder bg-panel px-3 py-2 text-copy-strong"
                value={draft.to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="flex items-center rounded-2xl border border-dashed border-panelBorder px-4 py-3 text-sm text-copy-muted">
            Поточний фільтр: {RANGE_LABELS[filters.range]} · {INTERVAL_LABELS[filters.interval]}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            className="ui-primary-button"
            disabled={isPending}
            onClick={apply}
          >
            {isPending ? 'Оновлюємо…' : 'Оновити'}
          </button>
          <button
            type="button"
            className="ui-secondary-button"
            disabled={isPending}
            onClick={reset}
          >
            Скинути
          </button>
        </div>
      </div>
    </section>
  )
}
