import { cache } from 'react'
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
} from '@/features/seo/seo.cache'
import { measureServerOperation } from '@/lib/observability/server-timing'
import { getCurrentRequestTrace } from '@/lib/observability/request-trace'
import { logInfo } from '@/utils/logger'

export { getCachedRobotsConfig, getCachedSitemapEntries } from '@/features/seo/seo.cache'

const getGlobalSeoRequestCached = cache(async () => {
  const trace = getCurrentRequestTrace()
  logInfo('seo-global:request-cache:before', {
    domain: 'seo',
    cache: 'react_cache:seo-global',
    requestId: trace?.requestId ?? null,
    route: trace?.route ?? null,
    cacheExecution: trace ? 'request' : 'background',
  })
  const seo = await getGlobalSeo()
  logInfo('seo-global:request-cache:after', {
    domain: 'seo',
    cache: 'react_cache:seo-global',
    requestId: trace?.requestId ?? null,
    route: trace?.route ?? null,
    cacheExecution: trace ? 'request' : 'background',
  })
  return seo
})

const getPageSeoRequestCached = cache(async (pageKey: string) => {
  const trace = getCurrentRequestTrace()
  logInfo('seo-page:request-cache:before', {
    domain: 'seo',
    cache: 'react_cache:seo-page',
    pageKey,
    requestId: trace?.requestId ?? null,
    route: trace?.route ?? null,
    cacheExecution: trace ? 'request' : 'background',
  })
  const seo = await getPageSeo(pageKey)
  logInfo('seo-page:request-cache:after', {
    domain: 'seo',
    cache: 'react_cache:seo-page',
    pageKey,
    requestId: trace?.requestId ?? null,
    route: trace?.route ?? null,
    cacheExecution: trace ? 'request' : 'background',
  })
  return seo
})

const getProductSeoRequestCached = cache(
  async (id: string) => {
    logInfo('seo-product:request-cache:before', {
      domain: 'seo',
      cache: 'react_cache:seo-product',
      id,
    })
    const seo = await getProductSeo({ id })
    logInfo('seo-product:request-cache:after', {
      domain: 'seo',
      cache: 'react_cache:seo-product',
      id,
    })
    return seo
  },
)

const getCategorySeoRequestCached = cache(
  async (slug: string) => {
    logInfo('seo-category:request-cache:before', {
      domain: 'seo',
      cache: 'react_cache:seo-category',
      slug,
    })
    const seo = await getCategorySeo({ slug })
    logInfo('seo-category:request-cache:after', {
      domain: 'seo',
      cache: 'react_cache:seo-category',
      slug,
    })
    return seo
  },
)

export const getCachedGlobalSeo = cache(async () =>
  {
    const result = await measureServerOperation(
      'getCachedGlobalSeo',
      {
        component: 'app/_lib/seo.data',
        seo: 'global',
        cache: 'react_cache:seo-global',
      },
      () => getGlobalSeoRequestCached(),
    )

    return result
  },
)

export const getCachedPageSeo = cache(async (pageKey: string) =>
  {
    const result = await measureServerOperation(
      'getCachedPageSeo',
      {
        component: 'app/_lib/seo.data',
        seo: 'page',
        cache: 'react_cache:seo-page',
        pageKey,
      },
      () => getPageSeoRequestCached(pageKey),
    )

    return result
  },
)

export const getCachedProductSeo = cache(async (id: string) =>
  {
    const result = await measureServerOperation(
      'getCachedProductSeo',
      {
        component: 'app/_lib/seo.data',
        seo: 'product',
        cache: 'react_cache:seo-product',
        id,
      },
      () => getProductSeoRequestCached(id),
    )

    return result
  },
)

export const getCachedCategorySeo = cache(async (slug: string) =>
  {
    const result = await measureServerOperation(
      'getCachedCategorySeo',
      {
        component: 'app/_lib/seo.data',
        seo: 'category',
        cache: 'react_cache:seo-category',
        slug,
      },
      () => getCategorySeoRequestCached(slug),
    )

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
