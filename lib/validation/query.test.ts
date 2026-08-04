import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  defaultedQueryBoolean,
  defaultedQueryNumber,
  defaultedQueryParam,
  optionalQueryBoolean,
  optionalQueryDate,
  optionalQueryDateTime,
  optionalQueryNumber,
  optionalQueryParam,
  optionalQueryString,
  optionalQueryUuid,
} from './query'

enum NativeStatus {
  Published = 'PUBLISHED',
  Draft = 'DRAFT',
}

describe('query validation helpers', () => {
  const literalEnumSchema = optionalQueryParam(z.enum(['NEW', 'HIT']))
  const nativeEnumSchema = optionalQueryParam(z.nativeEnum(NativeStatus))

  it('converts empty strings to undefined', () => {
    expect(literalEnumSchema.parse('')).toBeUndefined()
    expect(nativeEnumSchema.parse('')).toBeUndefined()
  })

  it('converts whitespace-only strings to undefined', () => {
    expect(literalEnumSchema.parse('   ')).toBeUndefined()
    expect(nativeEnumSchema.parse('\t')).toBeUndefined()
  })

  it('preserves undefined', () => {
    expect(literalEnumSchema.parse(undefined)).toBeUndefined()
    expect(nativeEnumSchema.parse(undefined)).toBeUndefined()
  })

  it('accepts valid enum values', () => {
    expect(literalEnumSchema.parse('HIT')).toBe('HIT')
    expect(nativeEnumSchema.parse('PUBLISHED')).toBe(NativeStatus.Published)
  })

  it('rejects invalid non-empty enum values', () => {
    expect(literalEnumSchema.safeParse('FEATURED').success).toBe(false)
    expect(nativeEnumSchema.safeParse('VISIBLE').success).toBe(false)
  })

  it('supports defaulted query params after empty normalization', () => {
    const schema = defaultedQueryParam(z.enum(['newest', 'popular']), 'newest')

    expect(schema.parse('')).toBe('newest')
    expect(schema.parse('popular')).toBe('popular')
    expect(schema.safeParse('oldest').success).toBe(false)
  })

  it('normalizes optional UUID query params', () => {
    const schema = optionalQueryUuid()
    const uuid = '550e8400-e29b-41d4-a716-446655440000'

    expect(schema.parse('')).toBeUndefined()
    expect(schema.parse('   ')).toBeUndefined()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse(uuid)).toBe(uuid)
    expect(schema.safeParse('not-a-uuid').success).toBe(false)
  })

  it('normalizes optional date query params', () => {
    const schema = optionalQueryDate()

    expect(schema.parse('')).toBeUndefined()
    expect(schema.parse('   ')).toBeUndefined()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse('2026-08-04')).toBe('2026-08-04')
    expect(schema.safeParse('04-08-2026').success).toBe(false)
  })

  it('normalizes optional datetime query params', () => {
    const schema = optionalQueryDateTime()

    expect(schema.parse('')).toBeUndefined()
    expect(schema.parse('   ')).toBeUndefined()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse('2026-08-04T12:00:00.000Z')).toBe('2026-08-04T12:00:00.000Z')
    expect(schema.safeParse('2026-08-04').success).toBe(false)
  })

  it('normalizes optional boolean query params without treating empty values as false', () => {
    const schema = optionalQueryBoolean()

    expect(schema.parse('')).toBeUndefined()
    expect(schema.parse('   ')).toBeUndefined()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse('true')).toBe(true)
    expect(schema.parse('false')).toBe(false)
    expect(schema.parse(true)).toBe(true)
    expect(schema.safeParse('yes').success).toBe(false)
  })

  it('supports defaulted boolean query params after empty normalization', () => {
    const schema = defaultedQueryBoolean(true)

    expect(schema.parse('')).toBe(true)
    expect(schema.parse('   ')).toBe(true)
    expect(schema.parse(undefined)).toBe(true)
    expect(schema.parse('false')).toBe(false)
    expect(schema.safeParse('no').success).toBe(false)
  })

  it('normalizes optional number query params', () => {
    const schema = optionalQueryNumber(z.coerce.number().int().min(1))

    expect(schema.parse('')).toBeUndefined()
    expect(schema.parse('   ')).toBeUndefined()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse('3')).toBe(3)
    expect(schema.safeParse('abc').success).toBe(false)
  })

  it('supports defaulted number query params after empty normalization', () => {
    const schema = defaultedQueryNumber(z.coerce.number().int().min(1), 1)

    expect(schema.parse('')).toBe(1)
    expect(schema.parse('   ')).toBe(1)
    expect(schema.parse(undefined)).toBe(1)
    expect(schema.parse('3')).toBe(3)
    expect(schema.safeParse('0').success).toBe(false)
  })

  it('normalizes optional string query params before strict string validation', () => {
    const schema = optionalQueryString(z.string().trim().min(1).max(10))

    expect(schema.parse('')).toBeUndefined()
    expect(schema.parse('   ')).toBeUndefined()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse('  hello  ')).toBe('hello')
    expect(schema.safeParse('too-long-value').success).toBe(false)
  })
})
