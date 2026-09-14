import { describe, expect, it, vi } from 'vitest'
import { SeoEntityType } from '@/app/generated/prisma/enums'

vi.stubEnv('APP_URL', 'https://marketplace.example.com')

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('not found')
  }),
}))

vi.mock('@/app/_lib/seo.data', () => ({
  getCachedCategorySeo: vi.fn(async () => ({
    entityType: SeoEntityType.CATEGORY,
    entityId: 'category-1',
    categoryId: 'category-1',
    categoryName: 'Сукні',
    categorySlug: 'sukni',
    categoryHref: '/catalog/women/sukni',
    title: 'Сукні купити онлайн | Marketplace',
    description: 'Добірка суконь на Marketplace.',
    keywords: null,
    canonicalUrl: 'https://marketplace.example.com/catalog/women/sukni',
    ogTitle: null,
    ogDescription: null,
    ogImageUrl: null,
    noIndex: false,
    noFollow: false,
    source: 'generated',
    breadcrumbJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [],
    },
  })),
}))

vi.mock('@/components/search/SearchResultsPageClient', () => ({
  default: () => null,
}))

vi.mock('@/components/search/SearchErrorState', () => ({
  default: () => null,
}))

vi.mock('@/components/category/category.server', () => ({
  fetchCategoryTree: vi.fn(async () => []),
}))

vi.mock('@/app/search/_lib/search-page.data', () => ({
  getSearchPageData: vi.fn(),
}))

describe('/catalog/[...slug] metadata', () => {
  it('uses canonical catalog category metadata without forcing noindex', async () => {
    const { generateMetadata } = await import('./page')

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: ['women', 'sukni'] }),
      searchParams: Promise.resolve({}),
    })

    expect(metadata.alternates?.canonical).toBe('https://marketplace.example.com/catalog/women/sukni')
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
    })
  })
})
