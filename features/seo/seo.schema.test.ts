import { describe, expect, it } from 'vitest'
import { SeoEntityType } from '@/app/generated/prisma/enums'
import {
  createSeoMetadataSchema,
  updateSeoMetadataSchema,
} from './seo.schema'

describe('seo schema validation', () => {
  it('accepts valid admin SEO create input', () => {
    const parsed = createSeoMetadataSchema.parse({
      entityType: SeoEntityType.CATEGORY,
      entityId: 'category-1',
      title: 'Жіночі сукні купити онлайн | Marketplace',
      description: 'SEO description',
      canonicalUrl: 'https://marketplace.example.com/products/category/dresses',
    })

    expect(parsed.entityType).toBe(SeoEntityType.CATEGORY)
  })

  it('rejects GLOBAL metadata with entityId', () => {
    const result = createSeoMetadataSchema.safeParse({
      entityType: SeoEntityType.GLOBAL,
      entityId: 'should-not-exist',
      title: 'Marketplace',
    })

    expect(result.success).toBe(false)
  })

  it('rejects non-global metadata without entityId', () => {
    const result = createSeoMetadataSchema.safeParse({
      entityType: SeoEntityType.PAGE,
      title: 'Catalog',
    })

    expect(result.success).toBe(false)
  })

  it('rejects empty SEO update payloads', () => {
    const result = updateSeoMetadataSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('rejects invalid canonical URLs', () => {
    const result = createSeoMetadataSchema.safeParse({
      entityType: SeoEntityType.STORE,
      entityId: 'store-1',
      title: 'Store title',
      canonicalUrl: 'not-a-url',
    })

    expect(result.success).toBe(false)
  })
})
