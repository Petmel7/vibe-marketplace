import { cache } from 'react'
import {
  getCategorySeo,
  getGlobalSeo,
  getPageSeo,
  getProductSeo,
  getRobotsConfig,
  getSitemapEntries,
  getWebsiteSearchActionJsonLd,
} from '@/features/seo/seo.service'

export const getCachedGlobalSeo = cache(async () => getGlobalSeo())

export const getCachedPageSeo = cache(async (pageKey: string) => getPageSeo(pageKey))

export const getCachedProductSeo = cache(async (id: string) => getProductSeo({ id }))

export const getCachedCategorySeo = cache(async (slug: string) => getCategorySeo({ slug }))

export const getCachedSitemapEntries = cache(async () => getSitemapEntries())

export const getCachedRobotsConfig = cache(async () => getRobotsConfig())

export const getCachedWebsiteJsonLd = cache(async () => getWebsiteSearchActionJsonLd())
