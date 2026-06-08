import { SeoEntityType } from '@/app/generated/prisma/client'
import { getServerEnv } from '@/config/env'
import type {
  BreadcrumbJsonLdDto,
  BreadcrumbJsonLdItemDto,
  ProductJsonLdDto,
  RobotsConfigDto,
  SitemapEntryDto,
  WebSiteSearchActionJsonLdDto,
} from './seo.dto'

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

export function getSeoBaseUrl() {
  const env = getServerEnv()
  const baseUrl = env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!baseUrl) {
    return 'http://localhost:3000'
  }

  return normalizeBaseUrl(baseUrl)
}

export function buildCanonicalUrl(pathname: string) {
  const baseUrl = getSeoBaseUrl()
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${baseUrl}${normalizedPath}`
}

export function buildBreadcrumbJsonLd(items: BreadcrumbJsonLdItemDto[]): BreadcrumbJsonLdDto {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  }
}

export function buildProductJsonLd(input: {
  name: string
  description?: string | null
  imageUrls?: string[]
  sku?: string | null
  category?: string | null
  storeName: string
  url: string
  price: string
  currency?: string
  inStock?: boolean
}): ProductJsonLdDto {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.imageUrls && input.imageUrls.length > 0 ? { image: input.imageUrls } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    ...(input.category ? { category: input.category } : {}),
    brand: {
      '@type': 'Brand',
      name: input.storeName,
    },
    offers: {
      '@type': 'Offer',
      url: input.url,
      priceCurrency: input.currency ?? 'UAH',
      price: input.price,
      availability: input.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: input.storeName,
      },
    },
  }
}

export function buildWebsiteSearchActionJsonLd(input: {
  siteName: string
  searchUrlTemplate: string
}): WebSiteSearchActionJsonLdDto {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.siteName,
    url: getSeoBaseUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: input.searchUrlTemplate,
      'query-input': 'required name=q',
    },
  }
}

export function buildDefaultRobotsConfig(): RobotsConfigDto {
  return {
    sitemapUrl: `${getSeoBaseUrl()}/sitemap.xml`,
    allow: ['/', '/catalog', '/categories', '/products', '/search'],
    disallow: ['/admin', '/seller', '/profile', '/checkout', '/api', '/internal'],
  }
}

export function buildStaticSitemapEntries(now = new Date()): SitemapEntryDto[] {
  const timestamp = now.toISOString()

  return [
    { loc: buildCanonicalUrl('/'), lastModified: timestamp, changeFrequency: 'daily', priority: 1 },
    { loc: buildCanonicalUrl('/catalog'), lastModified: timestamp, changeFrequency: 'daily', priority: 0.9 },
    { loc: buildCanonicalUrl('/categories'), lastModified: timestamp, changeFrequency: 'weekly', priority: 0.8 },
    { loc: buildCanonicalUrl('/products/hit'), lastModified: timestamp, changeFrequency: 'daily', priority: 0.7 },
    { loc: buildCanonicalUrl('/products/new'), lastModified: timestamp, changeFrequency: 'daily', priority: 0.7 },
    { loc: buildCanonicalUrl('/search'), lastModified: timestamp, changeFrequency: 'weekly', priority: 0.5 },
  ]
}

export function getDefaultEntityTypeForPage(pageKey: string) {
  return pageKey === 'global' ? SeoEntityType.GLOBAL : SeoEntityType.PAGE
}
