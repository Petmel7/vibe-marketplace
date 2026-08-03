import { describe, expect, it } from 'vitest'
import { heroBannerQuerySchema } from './hero.schema'

describe('heroBannerQuerySchema', () => {
  it('keeps status when destination type is submitted as an empty all-value', () => {
    const result = heroBannerQuerySchema.parse({
      status: 'PUBLISHED',
      destinationType: '',
    })

    expect(result.status).toBe('PUBLISHED')
    expect(result.destinationType).toBeUndefined()
  })

  it('keeps destination type when status is submitted as an empty all-value', () => {
    const result = heroBannerQuerySchema.parse({
      status: '',
      destinationType: 'PRODUCT',
    })

    expect(result.status).toBeUndefined()
    expect(result.destinationType).toBe('PRODUCT')
  })

  it('keeps both filters when both enum values are selected', () => {
    const result = heroBannerQuerySchema.parse({
      status: 'PAUSED',
      destinationType: 'CATEGORY',
    })

    expect(result.status).toBe('PAUSED')
    expect(result.destinationType).toBe('CATEGORY')
  })

  it('treats both empty filter values as no filters', () => {
    const result = heroBannerQuerySchema.parse({
      status: '',
      destinationType: '',
    })

    expect(result.status).toBeUndefined()
    expect(result.destinationType).toBeUndefined()
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('rejects invalid non-empty enum values', () => {
    const result = heroBannerQuerySchema.safeParse({
      status: 'VISIBLE',
      destinationType: 'PRODUCT',
    })

    expect(result.success).toBe(false)
  })
})
