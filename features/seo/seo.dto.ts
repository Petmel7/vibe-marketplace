import type { SeoEntityType } from '@/app/generated/prisma/client'

export type SeoMetadataDto = {
  id: string
  entityType: SeoEntityType
  entityId: string | null
  title: string
  description: string | null
  keywords: string | null
  canonicalUrl: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImageUrl: string | null
  noIndex: boolean
  noFollow: boolean
  createdAt: string
  updatedAt: string
}

export type SeoListQueryDto = {
  page: number
  limit: number
  entityType?: SeoEntityType
  entityId?: string
}

export type CreateSeoMetadataInputDto = {
  entityType: SeoEntityType
  entityId?: string | null
  title: string
  description?: string | null
  keywords?: string | null
  canonicalUrl?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImageUrl?: string | null
  noIndex?: boolean
  noFollow?: boolean
}

export type UpdateSeoMetadataInputDto = Partial<CreateSeoMetadataInputDto>

export type ResolvedSeoSource = 'override' | 'entity' | 'generated'

export type ResolvedSeoMetadataDto = {
  entityType: SeoEntityType
  entityId: string | null
  title: string
  description: string | null
  keywords: string | null
  canonicalUrl: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImageUrl: string | null
  noIndex: boolean
  noFollow: boolean
  source: ResolvedSeoSource
}

export type ProductSeoDto = ResolvedSeoMetadataDto & {
  productId: string
  productName: string
  storeName: string
  storeSlug: string
  categoryName: string | null
  categorySlug: string | null
  productJsonLd: ProductJsonLdDto
  breadcrumbJsonLd: BreadcrumbJsonLdDto
}

export type CategorySeoDto = ResolvedSeoMetadataDto & {
  categoryId: string
  categoryName: string
  categorySlug: string
  breadcrumbJsonLd: BreadcrumbJsonLdDto
}

export type StoreSeoDto = ResolvedSeoMetadataDto & {
  storeId: string
  storeName: string
  storeSlug: string
}

export type PageSeoDto = ResolvedSeoMetadataDto & {
  pageKey: string
}

export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

export type SitemapEntryDto = {
  loc: string
  lastModified: string
  changeFrequency: SitemapChangeFrequency
  priority: number
}

export type RobotsConfigDto = {
  sitemapUrl: string
  allow: string[]
  disallow: string[]
}

export type BreadcrumbJsonLdItemDto = {
  name: string
  item: string
}

export type BreadcrumbJsonLdDto = {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    item: string
  }>
}

export type ProductJsonLdDto = {
  '@context': 'https://schema.org'
  '@type': 'Product'
  name: string
  description?: string
  image?: string[]
  sku?: string
  category?: string
  brand?: {
    '@type': 'Brand'
    name: string
  }
  offers: {
    '@type': 'Offer'
    url: string
    priceCurrency: string
    price: string
    availability: string
    seller: {
      '@type': 'Organization'
      name: string
    }
  }
}

export type WebSiteSearchActionJsonLdDto = {
  '@context': 'https://schema.org'
  '@type': 'WebSite'
  name: string
  url: string
  potentialAction: {
    '@type': 'SearchAction'
    target: string
    'query-input': string
  }
}

export type SeoListDto = {
  items: SeoMetadataDto[]
  page: number
  limit: number
  total: number
}

