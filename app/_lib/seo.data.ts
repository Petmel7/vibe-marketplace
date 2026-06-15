import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import {
  getCategorySeo,
  getGlobalSeo,
  getPageSeo,
  getProductSeo,
  getWebsiteSearchActionJsonLd,
} from '@/features/seo/seo.service'
import {
  getCachedRobotsConfig,
  getCachedSitemapEntries,
  SEO_CACHE_TAGS,
} from '@/features/seo/seo.cache'

export { getCachedRobotsConfig, getCachedSitemapEntries } from '@/features/seo/seo.cache'

const getGlobalSeoCached = unstable_cache(
  async () => getGlobalSeo(),
  ['seo-global'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.robots, SEO_CACHE_TAGS.sitemap],
  },
)

const getPageSeoCached = unstable_cache(
  async (pageKey: string) => getPageSeo(pageKey),
  ['seo-page'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.robots, SEO_CACHE_TAGS.sitemap],
  },
)

const getProductSeoCached = unstable_cache(
  async (id: string) => getProductSeo({ id }),
  ['seo-product'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.products, SEO_CACHE_TAGS.sitemap],
  },
)

const getCategorySeoCached = unstable_cache(
  async (slug: string) => getCategorySeo({ slug }),
  ['seo-category'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.categories, SEO_CACHE_TAGS.sitemap],
  },
)

export const getCachedGlobalSeo = cache(async () => getGlobalSeoCached())

export const getCachedPageSeo = cache(async (pageKey: string) => getPageSeoCached(pageKey))

export const getCachedProductSeo = cache(async (id: string) => getProductSeoCached(id))

export const getCachedCategorySeo = cache(async (slug: string) => getCategorySeoCached(slug))

export const getCachedWebsiteJsonLd = cache(async () => getWebsiteSearchActionJsonLd())
