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
import { logInfo } from '@/utils/logger'

export { getCachedRobotsConfig, getCachedSitemapEntries } from '@/features/seo/seo.cache'

let globalSeoGenerationVersion = 0
const pageSeoGenerationVersions = new Map<string, number>()
const productSeoGenerationVersions = new Map<string, number>()
const categorySeoGenerationVersions = new Map<string, number>()

const getGlobalSeoCached = unstable_cache(
  async () => {
    globalSeoGenerationVersion += 1
    logInfo('seo-global:cache-callback:before', {
      domain: 'seo',
      cache: 'unstable_cache:seo-global',
    })
    const seo = await getGlobalSeo()
    logInfo('seo-global:cache-callback:after', {
      domain: 'seo',
      cache: 'unstable_cache:seo-global',
    })
    return seo
  },
  ['seo-global'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.robots, SEO_CACHE_TAGS.sitemap],
  },
)

const getPageSeoCached = unstable_cache(
  async (pageKey: string) => {
    pageSeoGenerationVersions.set(
      pageKey,
      (pageSeoGenerationVersions.get(pageKey) ?? 0) + 1,
    )
    logInfo('seo-page:cache-callback:before', {
      domain: 'seo',
      cache: 'unstable_cache:seo-page',
      pageKey,
    })
    const seo = await getPageSeo(pageKey)
    logInfo('seo-page:cache-callback:after', {
      domain: 'seo',
      cache: 'unstable_cache:seo-page',
      pageKey,
    })
    return seo
  },
  ['seo-page'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.robots, SEO_CACHE_TAGS.sitemap],
  },
)

const getProductSeoCached = unstable_cache(
  async (id: string) => {
    productSeoGenerationVersions.set(
      id,
      (productSeoGenerationVersions.get(id) ?? 0) + 1,
    )
    logInfo('seo-product:cache-callback:before', {
      domain: 'seo',
      cache: 'unstable_cache:seo-product',
      id,
    })
    const seo = await getProductSeo({ id })
    logInfo('seo-product:cache-callback:after', {
      domain: 'seo',
      cache: 'unstable_cache:seo-product',
      id,
    })
    return seo
  },
  ['seo-product'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.products, SEO_CACHE_TAGS.sitemap],
  },
)

const getCategorySeoCached = unstable_cache(
  async (slug: string) => {
    categorySeoGenerationVersions.set(
      slug,
      (categorySeoGenerationVersions.get(slug) ?? 0) + 1,
    )
    logInfo('seo-category:cache-callback:before', {
      domain: 'seo',
      cache: 'unstable_cache:seo-category',
      slug,
    })
    const seo = await getCategorySeo({ slug })
    logInfo('seo-category:cache-callback:after', {
      domain: 'seo',
      cache: 'unstable_cache:seo-category',
      slug,
    })
    return seo
  },
  ['seo-category'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.categories, SEO_CACHE_TAGS.sitemap],
  },
)

export const getCachedGlobalSeo = cache(async () =>
  {
    const beforeVersion = globalSeoGenerationVersion
    const result = await measureServerOperation(
      'getCachedGlobalSeo',
      {
        component: 'app/_lib/seo.data',
        seo: 'global',
        cache: 'unstable_cache:seo-global',
      },
      () => getGlobalSeoCached(),
    )

    if (process.env.NODE_ENV !== 'production') {
      logInfo(
        beforeVersion === globalSeoGenerationVersion
          ? 'seo-global:cache-hit'
          : 'seo-global:cache-miss-served',
        {
          domain: 'seo',
          cache: 'unstable_cache:seo-global',
        },
      )
    }

    return result
  },
)

export const getCachedPageSeo = cache(async (pageKey: string) =>
  {
    const beforeVersion = pageSeoGenerationVersions.get(pageKey) ?? 0
    const result = await measureServerOperation(
      'getCachedPageSeo',
      {
        component: 'app/_lib/seo.data',
        seo: 'page',
        cache: 'unstable_cache:seo-page',
        pageKey,
      },
      () => getPageSeoCached(pageKey),
    )

    if (process.env.NODE_ENV !== 'production') {
      logInfo(
        beforeVersion === (pageSeoGenerationVersions.get(pageKey) ?? 0)
          ? 'seo-page:cache-hit'
          : 'seo-page:cache-miss-served',
        {
          domain: 'seo',
          cache: 'unstable_cache:seo-page',
          pageKey,
        },
      )
    }

    return result
  },
)

export const getCachedProductSeo = cache(async (id: string) =>
  {
    const beforeVersion = productSeoGenerationVersions.get(id) ?? 0
    const result = await measureServerOperation(
      'getCachedProductSeo',
      {
        component: 'app/_lib/seo.data',
        seo: 'product',
        cache: 'unstable_cache:seo-product',
        id,
      },
      () => getProductSeoCached(id),
    )

    if (process.env.NODE_ENV !== 'production') {
      logInfo(
        beforeVersion === (productSeoGenerationVersions.get(id) ?? 0)
          ? 'seo-product:cache-hit'
          : 'seo-product:cache-miss-served',
        {
          domain: 'seo',
          cache: 'unstable_cache:seo-product',
          id,
        },
      )
    }

    return result
  },
)

export const getCachedCategorySeo = cache(async (slug: string) =>
  {
    const beforeVersion = categorySeoGenerationVersions.get(slug) ?? 0
    const result = await measureServerOperation(
      'getCachedCategorySeo',
      {
        component: 'app/_lib/seo.data',
        seo: 'category',
        cache: 'unstable_cache:seo-category',
        slug,
      },
      () => getCategorySeoCached(slug),
    )

    if (process.env.NODE_ENV !== 'production') {
      logInfo(
        beforeVersion === (categorySeoGenerationVersions.get(slug) ?? 0)
          ? 'seo-category:cache-hit'
          : 'seo-category:cache-miss-served',
        {
          domain: 'seo',
          cache: 'unstable_cache:seo-category',
          slug,
        },
      )
    }

    return result
  },
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
