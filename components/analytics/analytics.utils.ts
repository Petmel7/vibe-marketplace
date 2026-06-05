import type { AnalyticsSeriesPoint } from '@/types/analytics'
import { formatPrice } from '@/utils/formatters/price'

export function formatAnalyticsCurrency(value: string | number) {
  return formatPrice(value)
}

export function formatAnalyticsNumber(value: string | number) {
  return typeof value === 'number'
    ? value.toLocaleString('uk-UA')
    : Number(value).toLocaleString('uk-UA')
}

export function formatAnalyticsPercent(value: number | null | undefined) {
  if (value == null) {
    return 'Новий період'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`
}

export function getSeriesNumericValues(series: AnalyticsSeriesPoint[]) {
  return series.map((point) => Number(point.value))
}

export function summarizeSeries(series: AnalyticsSeriesPoint[]) {
  if (series.length === 0) {
    return 'Немає даних за вибраний період.'
  }

  const values = getSeriesNumericValues(series)
  const total = values.reduce((sum, value) => sum + value, 0)
  const highest = Math.max(...values, 0)
  return `Точок: ${series.length}. Сума: ${formatAnalyticsNumber(total)}. Пік: ${formatAnalyticsNumber(highest)}.`
}

export function getChartTicks(series: AnalyticsSeriesPoint[]) {
  if (series.length <= 3) {
    return series
  }

  const middleIndex = Math.floor((series.length - 1) / 2)
  return [series[0], series[middleIndex], series[series.length - 1]]
}

export function getTrendTone(value: number | null | undefined) {
  if (value == null) {
    return 'text-copy-muted'
  }

  if (value > 0) {
    return 'text-emerald-600'
  }

  if (value < 0) {
    return 'text-brand-danger'
  }

  return 'text-copy-muted'
}
