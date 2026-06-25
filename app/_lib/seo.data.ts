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
import { measureServerOperation } from '@/lib/observability/server-timing'

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

export const getCachedGlobalSeo = cache(async () =>
  measureServerOperation(
    'getCachedGlobalSeo',
    {
      component: 'app/_lib/seo.data',
      seo: 'global',
      cache: 'unstable_cache:seo-global',
    },
    () => getGlobalSeoCached(),
  ),
)

export const getCachedPageSeo = cache(async (pageKey: string) =>
  measureServerOperation(
    'getCachedPageSeo',
    {
      component: 'app/_lib/seo.data',
      seo: 'page',
      cache: 'unstable_cache:seo-page',
      pageKey,
    },
    () => getPageSeoCached(pageKey),
  ),
)

export const getCachedProductSeo = cache(async (id: string) =>
  measureServerOperation(
    'getCachedProductSeo',
    {
      component: 'app/_lib/seo.data',
      seo: 'product',
      cache: 'unstable_cache:seo-product',
      id,
    },
    () => getProductSeoCached(id),
  ),
)

export const getCachedCategorySeo = cache(async (slug: string) =>
  measureServerOperation(
    'getCachedCategorySeo',
    {
      component: 'app/_lib/seo.data',
      seo: 'category',
      cache: 'unstable_cache:seo-category',
      slug,
    },
    () => getCategorySeoCached(slug),
  ),
)

export const getCachedWebsiteJsonLd = cache(async () =>
  measureServerOperation(
    'getCachedWebsiteJsonLd',
    {
      component: 'app/_lib/seo.data',
      seo: 'website-jsonld',
    },
    () => getWebsiteSearchActionJsonLd(),
  ),
)
