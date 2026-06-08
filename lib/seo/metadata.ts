import type { Metadata } from 'next'
import type {
  PageSeoDto,
  ProductSeoDto,
  CategorySeoDto,
  ResolvedSeoMetadataDto,
} from '@/features/seo/seo.dto'

const SITE_NAME = 'Marketplace'
const DEFAULT_BASE_URL = 'http://localhost:3000'

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '')
}

export function getSeoBaseUrl() {
  const explicitBaseUrl =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!explicitBaseUrl) {
    return DEFAULT_BASE_URL
  }

  return normalizeBaseUrl(explicitBaseUrl)
}

export function absoluteUrl(value: string | null | undefined) {
  if (!value) {
    return null
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  const normalizedValue = value.startsWith('/') ? value : `/${value}`
  return `${getSeoBaseUrl()}${normalizedValue}`
}

export function buildCanonicalUrl(pathname: string) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${getSeoBaseUrl()}${normalizedPath}`
}

export function buildOgImageUrl(value: string | null | undefined) {
  return absoluteUrl(value) ?? undefined
}

function splitKeywords(value: string | null | undefined) {
  if (!value) {
    return undefined
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return items.length > 0 ? items : undefined
}

export function normalizeSeoMetadata<T extends ResolvedSeoMetadataDto>(
  seo: T,
  fallbackPath: string,
) {
  const canonicalUrl = absoluteUrl(seo.canonicalUrl) ?? buildCanonicalUrl(fallbackPath)
  const ogImageUrl = buildOgImageUrl(seo.ogImageUrl)

  return {
    ...seo,
    canonicalUrl,
    ogImageUrl,
  }
}

type SeoMetadataOptions = {
  fallbackPath: string
  forceNoIndex?: boolean
  forceNoFollow?: boolean
  openGraphType?: 'website' | 'article'
}

export function seoToMetadata(
  seo: ResolvedSeoMetadataDto,
  options: SeoMetadataOptions,
): Metadata {
  const normalized = normalizeSeoMetadata(seo, options.fallbackPath)
  const description = normalized.description ?? undefined
  const ogTitle = normalized.ogTitle ?? normalized.title
  const ogDescription = normalized.ogDescription ?? normalized.description ?? undefined
  const noIndex = options.forceNoIndex ?? normalized.noIndex
  const noFollow = options.forceNoFollow ?? normalized.noFollow
  const keywords = splitKeywords(normalized.keywords)
  const twitterImages = normalized.ogImageUrl ? [normalized.ogImageUrl] : undefined

  return {
    title: normalized.title,
    description,
    keywords,
    alternates: {
      canonical: normalized.canonicalUrl,
    },
    openGraph: {
      type: options.openGraphType ?? 'website',
      title: ogTitle,
      description: ogDescription,
      url: normalized.canonicalUrl,
      siteName: SITE_NAME,
      locale: 'uk_UA',
      images: normalized.ogImageUrl
        ? [
            {
              url: normalized.ogImageUrl,
              alt: ogTitle,
            },
          ]
        : undefined,
    },
    twitter: {
      card: normalized.ogImageUrl ? 'summary_large_image' : 'summary',
      title: ogTitle,
      description: ogDescription,
      images: twitterImages,
    },
    robots: {
      index: !noIndex,
      follow: !noFollow,
    },
  }
}

export function buildHomeMetadata(seo: PageSeoDto): Metadata {
  return seoToMetadata(seo, {
    fallbackPath: '/',
    openGraphType: 'website',
  })
}

export function buildProductMetadata(seo: ProductSeoDto): Metadata {
  return seoToMetadata(seo, {
    fallbackPath: `/products/${seo.productId}`,
    openGraphType: 'website',
  })
}

export function buildCategoryMetadata(seo: CategorySeoDto): Metadata {
  return seoToMetadata(seo, {
    fallbackPath: `/products/category/${seo.categorySlug}`,
    openGraphType: 'website',
  })
}

export function buildSearchMetadata(seo: PageSeoDto, query: string | null): Metadata {
  const normalizedQuery = query?.trim() || null
  const title = normalizedQuery ? `Пошук: ${normalizedQuery} | ${SITE_NAME}` : 'Пошук товарів | Marketplace'
  const description =
    normalizedQuery
      ? `Результати пошуку за запитом «${normalizedQuery}» на Marketplace.`
      : 'Пошук товарів на Marketplace за категоріями, ціною та рейтингом.'

  return seoToMetadata(
    {
      ...seo,
      title: seo.source === 'generated' ? title : seo.title,
      description: seo.source === 'generated' ? description : seo.description,
    },
    {
      fallbackPath: '/search',
      forceNoIndex: true,
      openGraphType: 'website',
    },
  )
}

export function buildStaticPageMetadata(
  seo: PageSeoDto,
  input: {
    fallbackPath: string
    fallbackTitle: string
    fallbackDescription: string
    forceNoIndex?: boolean
  },
): Metadata {
  return seoToMetadata(
    {
      ...seo,
      title: seo.source === 'generated' ? input.fallbackTitle : seo.title,
      description: seo.source === 'generated' ? input.fallbackDescription : seo.description,
    },
    {
      fallbackPath: input.fallbackPath,
      forceNoIndex: input.forceNoIndex,
      openGraphType: 'website',
    },
  )
}
