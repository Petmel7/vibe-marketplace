import { describe, expect, it } from 'vitest'
import {
  analyticsQuerySchema,
  sellerAnalyticsQuerySchema,
} from '@/features/analytics/analytics.schema'

describe('analyticsQuerySchema', () => {
  it('accepts a valid create-like analytics range query', () => {
    const parsed = analyticsQuerySchema.parse({
      range: '30d',
      interval: 'day',
    })

    expect(parsed.range).toBe('30d')
    expect(parsed.interval).toBe('day')
  })

  it('accepts optional storeId on seller query', () => {
    const parsed = sellerAnalyticsQuerySchema.parse({
      range: 'custom',
      from: '2026-05-01',
      to: '2026-05-31',
      storeId: '8ad41932-5f3b-4870-b4c5-4c7698de8c0e',
    })

    expect(parsed.storeId).toBe('8ad41932-5f3b-4870-b4c5-4c7698de8c0e')
  })

  it('rejects an empty custom range query', () => {
    const result = analyticsQuerySchema.safeParse({ range: 'custom' })

    expect(result.success).toBe(false)
  })

  it('rejects an invalid date range', () => {
    const result = analyticsQuerySchema.safeParse({
      range: 'custom',
      from: '2026-06-10',
      to: '2026-06-01',
    })

    expect(result.success).toBe(false)
  })

  it('rejects an oversized custom range', () => {
    const result = analyticsQuerySchema.safeParse({
      range: 'custom',
      from: '2025-01-01',
      to: '2026-06-01',
    })

    expect(result.success).toBe(false)
  })
})
