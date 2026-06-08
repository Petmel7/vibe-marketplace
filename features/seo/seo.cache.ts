import { revalidateTag, unstable_cache } from 'next/cache'
import { SeoEntityType } from '@/app/generated/prisma/enums'
import { logInfo, logWarn } from '@/utils/logger'

export const SEO_SITEMAP_REVALIDATE_SECONDS = 60 * 60
export const SEO_ROBOTS_REVALIDATE_SECONDS = 24 * 60 * 60

export const SEO_CACHE_TAGS = {
  sitemap: 'seo:sitemap',
  robots: 'seo:robots',
  products: 'seo:products',
  categories: 'seo:categories',
  stores: 'seo:stores',
} as const

const SITEMAP_CACHE_TAGS = [
  SEO_CACHE_TAGS.sitemap,
  SEO_CACHE_TAGS.products,
  SEO_CACHE_TAGS.categories,
  SEO_CACHE_TAGS.stores,
] as const

const ROBOTS_CACHE_TAGS = [SEO_CACHE_TAGS.robots] as const

let sitemapGenerationVersion = 0
let robotsGenerationVersion = 0

const cachedSitemapEntries = unstable_cache(
  async () => {
    sitemapGenerationVersion += 1
    if (process.env.NODE_ENV !== 'production') {
      logInfo('seo:sitemap-cache-miss', {
        domain: 'seo',
        tags: [...SITEMAP_CACHE_TAGS],
      })
    }

    const { getSitemapEntries } = await import('./seo.service')
    return getSitemapEntries()
  },
  ['seo-sitemap'],
  {
    revalidate: SEO_SITEMAP_REVALIDATE_SECONDS,
    tags: [...SITEMAP_CACHE_TAGS],
  },
)

const cachedRobotsConfig = unstable_cache(
  async () => {
    robotsGenerationVersion += 1
    if (process.env.NODE_ENV !== 'production') {
      logInfo('seo:robots-cache-miss', {
        domain: 'seo',
        tags: [...ROBOTS_CACHE_TAGS],
      })
    }

    const { getRobotsConfig } = await import('./seo.service')
    return getRobotsConfig()
  },
  ['seo-robots'],
  {
    revalidate: SEO_ROBOTS_REVALIDATE_SECONDS,
    tags: [...ROBOTS_CACHE_TAGS],
  },
)

export async function getCachedSitemapEntries() {
  const beforeVersion = sitemapGenerationVersion
  const result = await cachedSitemapEntries()

  if (process.env.NODE_ENV !== 'production') {
    logInfo(
      beforeVersion === sitemapGenerationVersion ? 'seo:sitemap-cache-hit' : 'seo:sitemap-cache-miss-served',
      {
        domain: 'seo',
        tags: [...SITEMAP_CACHE_TAGS],
      },
    )
  }

  return result
}

export async function getCachedRobotsConfig() {
  const beforeVersion = robotsGenerationVersion
  const result = await cachedRobotsConfig()

  if (process.env.NODE_ENV !== 'production') {
    logInfo(
      beforeVersion === robotsGenerationVersion ? 'seo:robots-cache-hit' : 'seo:robots-cache-miss-served',
      {
        domain: 'seo',
        tags: [...ROBOTS_CACHE_TAGS],
      },
    )
  }

  return result
}

export function getSeoRevalidationTagsForEntity(entityType: SeoEntityType) {
  switch (entityType) {
    case SeoEntityType.PRODUCT:
      return [SEO_CACHE_TAGS.sitemap, SEO_CACHE_TAGS.products]
    case SeoEntityType.CATEGORY:
      return [SEO_CACHE_TAGS.sitemap, SEO_CACHE_TAGS.categories]
    case SeoEntityType.STORE:
      return [SEO_CACHE_TAGS.sitemap, SEO_CACHE_TAGS.stores]
    case SeoEntityType.GLOBAL:
    case SeoEntityType.PAGE:
    default:
      return [SEO_CACHE_TAGS.sitemap, SEO_CACHE_TAGS.robots]
  }
}

function revalidateSeoTags(tags: string[]) {
  for (const tag of new Set(tags)) {
    try {
      revalidateTag(tag, 'max')
    } catch (error) {
      logWarn(
        'seo:revalidate-tag-failed',
        {
          domain: 'seo',
          tag,
        },
        error,
      )
    }
  }
}

export function revalidateSeoForMetadataEntity(entityType: SeoEntityType) {
  revalidateSeoTags(getSeoRevalidationTagsForEntity(entityType))
}

export function revalidateSeoForProductChange() {
  revalidateSeoTags([SEO_CACHE_TAGS.sitemap, SEO_CACHE_TAGS.products])
}

export function revalidateSeoForCategoryChange() {
  revalidateSeoTags([SEO_CACHE_TAGS.sitemap, SEO_CACHE_TAGS.categories])
}

export function revalidateSeoForStoreChange() {
  revalidateSeoTags([SEO_CACHE_TAGS.sitemap, SEO_CACHE_TAGS.stores])
}

export function revalidateSeoForRobotsChange() {
  revalidateSeoTags([SEO_CACHE_TAGS.robots])
}
