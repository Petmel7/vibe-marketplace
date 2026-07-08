import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SeoEntityType } from '@/app/generated/prisma/enums'

const {
  unstableCacheMock,
  revalidateTagMock,
  logInfoMock,
  logWarnMock,
  getSitemapEntriesMock,
  getRobotsConfigMock,
} = vi.hoisted(() => ({
  unstableCacheMock: vi.fn(),
  revalidateTagMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarnMock: vi.fn(),
  getSitemapEntriesMock: vi.fn(),
  getRobotsConfigMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: unstableCacheMock,
  revalidateTag: revalidateTagMock,
}))

vi.mock('@/utils/logger', () => ({
  logInfo: logInfoMock,
  logWarn: logWarnMock,
}))

vi.mock('./seo.service', () => ({
  getSitemapEntries: getSitemapEntriesMock,
  getRobotsConfig: getRobotsConfigMock,
}))

describe('seo cache helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    unstableCacheMock.mockImplementation((fn: () => Promise<unknown>) => fn)
  })

  it('wraps sitemap generation in a cache loader and preserves response shape', async () => {
    getSitemapEntriesMock.mockResolvedValue([
      {
        loc: 'https://marketplace.example.com/products/product-1',
        lastModified: '2026-06-08T12:00:00.000Z',
        changeFrequency: 'daily',
        priority: 0.8,
      },
    ])

    const { getCachedSitemapEntries } = await import('./seo.cache')
    const result = await getCachedSitemapEntries()

    expect(result).toEqual([
      {
        loc: 'https://marketplace.example.com/products/product-1',
        lastModified: '2026-06-08T12:00:00.000Z',
        changeFrequency: 'daily',
        priority: 0.8,
      },
    ])
    expect(unstableCacheMock).toHaveBeenCalled()
  })

  it('revalidates only products tag for product SEO changes', async () => {
    const { revalidateSeoForMetadataEntity, SEO_CACHE_TAGS } = await import('./seo.cache')

    revalidateSeoForMetadataEntity(SeoEntityType.PRODUCT)

    expect(revalidateTagMock).toHaveBeenCalledWith(SEO_CACHE_TAGS.products, 'max')
  })

  it('revalidates robots tag for global SEO changes', async () => {
    const { revalidateSeoForMetadataEntity, SEO_CACHE_TAGS } = await import('./seo.cache')

    revalidateSeoForMetadataEntity(SeoEntityType.GLOBAL)

    expect(revalidateTagMock).toHaveBeenCalledWith(SEO_CACHE_TAGS.sitemap, 'max')
    expect(revalidateTagMock).toHaveBeenCalledWith(SEO_CACHE_TAGS.robots, 'max')
  })
})
