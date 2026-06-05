import EmptyState from '@/components/profile/EmptyState'
import type { AnalyticsSeriesPoint } from '@/types/analytics'
import { getChartTicks, summarizeSeries } from './analytics.utils'

function createLinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function buildChartPoints(series: AnalyticsSeriesPoint[]) {
  const values = series.map((point) => Number(point.value))
  const width = 100
  const height = 44
  const max = Math.max(...values, 0)
  const denominator = max === 0 ? 1 : max

  return series.map((point, index) => ({
    ...point,
    x: series.length === 1 ? width / 2 : (index / (series.length - 1)) * width,
    y: height - (Number(point.value) / denominator) * height,
  }))
}

export default function AnalyticsLineChart({
  series,
  stroke = '#e11d48',
  valueLabel,
}: {
  series: AnalyticsSeriesPoint[]
  stroke?: string
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

  const points = buildChartPoints(series)
  const path = createLinePath(points)
  const ticks = getChartTicks(series)

  return (
    <div className="space-y-4">
      <div
        className="rounded-3xl border border-panelBorder bg-panel/50 p-4"
        role="img"
        aria-label={`${valueLabel}. ${summarizeSeries(series)}`}
      >
        <svg viewBox="0 0 100 44" className="h-52 w-full overflow-visible" preserveAspectRatio="none">
          <path d="M 0 44 L 100 44" stroke="currentColor" className="text-panelBorder" strokeWidth="0.6" />
          <path d={path} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => (
            <circle key={point.date} cx={point.x} cy={point.y} r="1.6" fill={stroke}>
              <title>{`${point.label}: ${point.value}`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between gap-4 text-xs text-copy-muted">
        {ticks.map((tick) => (
          <span key={tick.date}>{tick.label}</span>
        ))}
      </div>
    </div>
  )
}
