import Decimal from 'decimal.js'
import type { AnalyticsSeriesPointDto } from './analytics.dto'
import type { AnalyticsInterval } from './analytics.types'
import type { AnalyticsQuery } from './analytics.schema'
import { InvalidAnalyticsRangeError } from '@/lib/errors/analytics'

const DAY_MS = 86_400_000

export type { AnalyticsInterval } from './analytics.types'

export type AnalyticsRangeWindow = {
  from: Date
  to: Date
}

export type AnalyticsResolvedRange = {
  current: AnalyticsRangeWindow
  previous: AnalyticsRangeWindow
  interval: AnalyticsInterval
}

export type AnalyticsDateBucket = {
  date: string
  label: string
}

export type AnalyticsGroupedPoint = {
  value: Decimal
  secondaryValue?: Decimal
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime())
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

export function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

export function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay()
  const normalizedDay = day === 0 ? 6 : day - 1
  return addUtcDays(startOfUtcDay(date), -normalizedDay)
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

export function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  )
}

function parseAnalyticsDate(value: string, endOfDay = false): Date {
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/
  const parsed = dateOnlyPattern.test(value)
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidAnalyticsRangeError('Analytics dates must be valid')
  }

  return parsed
}

export function getDefaultInterval(range: AnalyticsQuery['range']): AnalyticsInterval {
  switch (range) {
    case '12m':
      return 'month'
    case '90d':
      return 'week'
    default:
      return 'day'
  }
}

export function resolveAnalyticsDateRange(
  query: AnalyticsQuery,
  now = new Date(),
): AnalyticsResolvedRange {
  const safeNow = cloneDate(now)
  const currentEnd = endOfUtcDay(safeNow)
  let currentStart: Date

  switch (query.range) {
    case '7d':
      currentStart = startOfUtcDay(addUtcDays(safeNow, -6))
      break
    case '30d':
      currentStart = startOfUtcDay(addUtcDays(safeNow, -29))
      break
    case '90d':
      currentStart = startOfUtcDay(addUtcDays(safeNow, -89))
      break
    case '12m':
      currentStart = startOfUtcMonth(addUtcMonths(safeNow, -11))
      break
    case 'custom':
      if (!query.from || !query.to) {
        throw new InvalidAnalyticsRangeError('Custom analytics range requires from and to')
      }
      currentStart = startOfUtcDay(parseAnalyticsDate(query.from))
      return resolveCustomAnalyticsDateRange(query, currentStart, endOfUtcDay(parseAnalyticsDate(query.to, true)))
    default:
      throw new InvalidAnalyticsRangeError('Unsupported analytics range')
  }

  return resolveCustomAnalyticsDateRange(query, currentStart, currentEnd)
}

function resolveCustomAnalyticsDateRange(
  query: AnalyticsQuery,
  currentStart: Date,
  currentEnd: Date,
): AnalyticsResolvedRange {
  if (currentStart.getTime() > currentEnd.getTime()) {
    throw new InvalidAnalyticsRangeError('Analytics range start must be before range end')
  }

  const durationDays = Math.floor((currentEnd.getTime() - currentStart.getTime()) / DAY_MS) + 1
  const previousEnd = endOfUtcDay(addUtcDays(currentStart, -1))
  const previousStart = startOfUtcDay(addUtcDays(previousEnd, -(durationDays - 1)))

  return {
    current: { from: currentStart, to: currentEnd },
    previous: { from: previousStart, to: previousEnd },
    interval: query.interval ?? getDefaultInterval(query.range),
  }
}

export function formatBucketDate(date: Date, interval: AnalyticsInterval): string {
  switch (interval) {
    case 'day':
      return date.toISOString().slice(0, 10)
    case 'week':
      return date.toISOString().slice(0, 10)
    case 'month':
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  }
}

export function getBucketStart(date: Date, interval: AnalyticsInterval): Date {
  switch (interval) {
    case 'day':
      return startOfUtcDay(date)
    case 'week':
      return startOfUtcWeek(date)
    case 'month':
      return startOfUtcMonth(date)
  }
}

export function buildDateBuckets(
  from: Date,
  to: Date,
  interval: AnalyticsInterval,
): AnalyticsDateBucket[] {
  const buckets: AnalyticsDateBucket[] = []
  let cursor = getBucketStart(from, interval)
  const end = getBucketStart(to, interval)

  while (cursor.getTime() <= end.getTime()) {
    const date = formatBucketDate(cursor, interval)
    buckets.push({ date, label: date })

    cursor =
      interval === 'day'
        ? addUtcDays(cursor, 1)
        : interval === 'week'
          ? addUtcDays(cursor, 7)
          : addUtcMonths(cursor, 1)
  }

  return buckets
}

export function groupByInterval<T>(
  items: T[],
  options: {
    interval: AnalyticsInterval
    getDate: (item: T) => Date
    getValue?: (item: T) => Decimal.Value
    getSecondaryValue?: (item: T) => Decimal.Value | undefined
  },
): Map<string, AnalyticsGroupedPoint> {
  const grouped = new Map<string, AnalyticsGroupedPoint>()

  for (const item of items) {
    const date = options.getDate(item)
    const bucketKey = formatBucketDate(getBucketStart(date, options.interval), options.interval)
    const value = new Decimal(options.getValue?.(item) ?? 1)
    const secondaryValue = options.getSecondaryValue?.(item)
    const existing = grouped.get(bucketKey) ?? { value: new Decimal(0) }

    existing.value = existing.value.plus(value)
    if (secondaryValue !== undefined) {
      existing.secondaryValue = (existing.secondaryValue ?? new Decimal(0)).plus(secondaryValue)
    }

    grouped.set(bucketKey, existing)
  }

  return grouped
}

export function fillMissingBucketsWithZero(
  buckets: AnalyticsDateBucket[],
  grouped: Map<string, AnalyticsGroupedPoint>,
  formatter: (value: Decimal) => string | number = (value) => value.toString(),
): AnalyticsSeriesPointDto[] {
  return buckets.map((bucket) => {
    const point = grouped.get(bucket.date)
    return {
      date: bucket.date,
      label: bucket.label,
      value: formatter(point?.value ?? new Decimal(0)),
      secondaryValue:
        point?.secondaryValue !== undefined ? formatter(point.secondaryValue) : undefined,
    }
  })
}

export function calculateGrowthPercent(
  current: Decimal.Value,
  previous: Decimal.Value,
): number | null {
  const currentValue = new Decimal(current)
  const previousValue = new Decimal(previous)

  if (previousValue.eq(0)) {
    return currentValue.eq(0) ? 0 : null
  }

  return Number(currentValue.minus(previousValue).div(previousValue).mul(100).toFixed(2))
}
