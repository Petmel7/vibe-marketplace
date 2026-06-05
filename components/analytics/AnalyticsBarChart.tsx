import EmptyState from '@/components/profile/EmptyState'
import type { AnalyticsSeriesPoint } from '@/types/analytics'
import { getChartTicks, summarizeSeries } from './analytics.utils'

export default function AnalyticsBarChart({
  series,
  color = '#2563eb',
  valueLabel,
}: {
  series: AnalyticsSeriesPoint[]
  color?: string
  valueLabel: string
}) {
  if (series.length === 0) {
    return (
      <EmptyState
        title="Немає точок для графіка"
        description="Дані з’являться, щойно бекенд поверне серію для вибраного періоду."
      />
    )
  }

  const values = series.map((point) => Number(point.value))
  const max = Math.max(...values, 0)
  const denominator = max === 0 ? 1 : max
  const ticks = getChartTicks(series)

  return (
    <div className="space-y-4">
      <div
        className="flex h-52 items-end gap-2 rounded-3xl border border-panelBorder bg-panel/50 p-4"
        role="img"
        aria-label={`${valueLabel}. ${summarizeSeries(series)}`}
      >
        {series.map((point) => {
          const height = `${Math.max((Number(point.value) / denominator) * 100, 4)}%`

          return (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <div
                className="w-full rounded-t-2xl"
                style={{ height, backgroundColor: color }}
                title={`${point.label}: ${point.value}`}
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-4 text-xs text-copy-muted">
        {ticks.map((tick) => (
          <span key={tick.date}>{tick.label}</span>
        ))}
      </div>
    </div>
  )
}
