import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  unstableCacheMock,
  reactCacheMock,
  getGlobalSeoMock,
  getPageSeoMock,
  getProductSeoMock,
  getCategorySeoMock,
  getWebsiteSearchActionJsonLdMock,
} = vi.hoisted(() => ({
  unstableCacheMock: vi.fn(),
  reactCacheMock: vi.fn(),
  getGlobalSeoMock: vi.fn(),
  getPageSeoMock: vi.fn(),
  getProductSeoMock: vi.fn(),
  getCategorySeoMock: vi.fn(),
  getWebsiteSearchActionJsonLdMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: unstableCacheMock,
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: reactCacheMock,
  }
})

vi.mock('@/features/seo/seo.service', () => ({
  getGlobalSeo: getGlobalSeoMock,
  getPageSeo: getPageSeoMock,
  getProductSeo: getProductSeoMock,
  getCategorySeo: getCategorySeoMock,
  getWebsiteSearchActionJsonLd: getWebsiteSearchActionJsonLdMock,
}))

vi.mock('@/features/seo/seo.cache', () => ({
  getCachedRobotsConfig: vi.fn(),
  getCachedSitemapEntries: vi.fn(),
  SEO_CACHE_TAGS: {
    sitemap: 'seo:sitemap',
    robots: 'seo:robots',
    products: 'seo:products',
    categories: 'seo:categories',
    stores: 'seo:stores',
  },
}))

function createMemoizedWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  const cache = new Map<string, TResult>()

  return (...args: TArgs) => {
    const key = JSON.stringify(args)
    if (!cache.has(key)) {
      cache.set(key, fn(...args))
    }

    return cache.get(key) as TResult
  }
}

describe('seo data loaders', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    unstableCacheMock.mockImplementation((fn: (...args: unknown[]) => unknown) => createMemoizedWrapper(fn))
    reactCacheMock.mockImplementation((fn: (...args: unknown[]) => unknown) => createMemoizedWrapper(fn))
  })

  it('reuses cached product seo lookups for the same id', async () => {
    getProductSeoMock.mockResolvedValue({
      title: 'Куртка купити онлайн | Store',
      description: 'Опис',
    })

    const { getCachedProductSeo } = await import('./seo.data')
    const [first, second] = await Promise.all([
      getCachedProductSeo('prod-1'),
      getCachedProductSeo('prod-1'),
    ])

    expect(first).toEqual(second)
    expect(getProductSeoMock).toHaveBeenCalledTimes(1)
    expect(getProductSeoMock).toHaveBeenCalledWith({ id: 'prod-1' })
  })
})
