import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { defaultedQueryParam, optionalQueryParam } from './query'

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
})
