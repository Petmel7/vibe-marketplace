import { cache } from 'react'
import {
  getCategorySeo,
  getGlobalSeo,
  getPageSeo,
  getProductSeo,
  getWebsiteSearchActionJsonLd,
} from '@/features/seo/seo.service'
export { getCachedRobotsConfig, getCachedSitemapEntries } from '@/features/seo/seo.cache'

export const getCachedGlobalSeo = cache(async () => getGlobalSeo())

export const getCachedPageSeo = cache(async (pageKey: string) => getPageSeo(pageKey))

export const getCachedProductSeo = cache(async (id: string) => getProductSeo({ id }))

export const getCachedCategorySeo = cache(async (slug: string) => getCategorySeo({ slug }))

export const getCachedWebsiteJsonLd = cache(async () => getWebsiteSearchActionJsonLd())
