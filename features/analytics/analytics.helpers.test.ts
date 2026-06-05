import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import {
  buildDateBuckets,
  calculateGrowthPercent,
  fillMissingBucketsWithZero,
  groupByInterval,
  resolveAnalyticsDateRange,
} from '@/features/analytics/analytics.helpers'

describe('analytics.helpers', () => {
  it('builds zero-filled day buckets for a custom range', () => {
    const range = resolveAnalyticsDateRange(
      {
        range: 'custom',
        from: '2026-06-01',
        to: '2026-06-03',
        interval: 'day',
      },
      new Date('2026-06-03T12:00:00.000Z'),
    )

    const buckets = buildDateBuckets(range.current.from, range.current.to, range.interval)
    const grouped = groupByInterval(
      [{ createdAt: new Date('2026-06-02T10:00:00.000Z'), amount: '12.50' }],
      {
        interval: range.interval,
        getDate: (item) => item.createdAt,
        getValue: (item) => item.amount,
      },
    )
    const filled = fillMissingBucketsWithZero(buckets, grouped)

    expect(filled).toEqual([
      { date: '2026-06-01', label: '2026-06-01', value: '0' },
      { date: '2026-06-02', label: '2026-06-02', value: '12.5' },
      { date: '2026-06-03', label: '2026-06-03', value: '0' },
    ])
  })

  it('groups weekly values into the same bucket', () => {
    const grouped = groupByInterval(
      [
        { createdAt: new Date('2026-06-01T09:00:00.000Z'), value: '1' },
        { createdAt: new Date('2026-06-03T09:00:00.000Z'), value: '2' },
      ],
      {
        interval: 'week',
        getDate: (item) => item.createdAt,
        getValue: (item) => item.value,
      },
    )

    expect(grouped.get('2026-06-01')?.value.eq(new Decimal(3))).toBe(true)
  })

  it('calculates growth percent safely', () => {
    expect(calculateGrowthPercent('150', '100')).toBe(50)
    expect(calculateGrowthPercent('0', '0')).toBe(0)
    expect(calculateGrowthPercent('10', '0')).toBeNull()
  })
})
