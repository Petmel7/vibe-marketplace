import { describe, expect, it, vi } from 'vitest'
import { SeoEntityType } from '@/app/generated/prisma/enums'
import {
  buildCategoryMetadata,
  buildHomeMetadata,
  buildProductMetadata,
  buildSearchMetadata,
} from './metadata'

vi.stubEnv('APP_URL', 'https://marketplace.example.com')

describe('seo metadata helpers', () => {
  it('builds homepage metadata from backend seo data', () => {
    const metadata = buildHomeMetadata({
      entityType: SeoEntityType.GLOBAL,
      entityId: null,
      pageKey: 'global',
      title: 'Marketplace',
      description: 'Головна сторінка маркетплейсу.',
      keywords: 'marketplace, одяг',
      canonicalUrl: 'https://marketplace.example.com/',
      ogTitle: 'Marketplace',
      ogDescription: 'Головна сторінка маркетплейсу.',
      ogImageUrl: 'https://cdn.example.com/og-home.jpg',
      noIndex: false,
      noFollow: false,
      source: 'override',
    })

    const images = Array.isArray(metadata.openGraph?.images)
      ? metadata.openGraph.images
      : metadata.openGraph?.images
        ? [metadata.openGraph.images]
        : []

    expect(metadata.title).toBe('Marketplace')
    expect(metadata.alternates?.canonical).toBe('https://marketplace.example.com/')
    expect(images[0]).toMatchObject({
      url: 'https://cdn.example.com/og-home.jpg',
    })
  })

  it('builds product metadata with canonical product url', () => {
    const metadata = buildProductMetadata({
      entityType: SeoEntityType.PRODUCT,
      entityId: 'product-1',
      productId: 'product-1',
      productName: 'Сукня',
      storeName: 'Atelier',
      storeSlug: 'atelier',
      categoryName: 'Сукні',
      categorySlug: 'sukni',
      title: 'Сукня купити онлайн | Atelier',
      description: 'Сукня. Ціна, відгуки та доставка по Україні.',
      keywords: null,
      canonicalUrl: 'https://marketplace.example.com/products/product-1',
      ogTitle: 'Сукня купити онлайн | Atelier',
      ogDescription: 'Сукня. Ціна, відгуки та доставка по Україні.',
      ogImageUrl: 'https://cdn.example.com/product.jpg',
      noIndex: false,
      noFollow: false,
      source: 'generated',
      productJsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Сукня',
        offers: {
          '@type': 'Offer',
          url: 'https://marketplace.example.com/products/product-1',
          priceCurrency: 'UAH',
          price: '1999.00',
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: 'Atelier',
          },
        },
      },
      breadcrumbJsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [],
      },
    })

    expect(metadata.alternates?.canonical).toBe('https://marketplace.example.com/products/product-1')
    expect(metadata.robots).toMatchObject({ index: true, follow: true })
  })

  it('builds category metadata from category seo data', () => {
    const metadata = buildCategoryMetadata({
      entityType: SeoEntityType.CATEGORY,
      entityId: 'category-1',
      categoryId: 'category-1',
      categoryName: 'Сукні',
      categorySlug: 'sukni',
      title: 'Сукні купити онлайн | Marketplace',
      description: 'Добірка суконь на Marketplace.',
      keywords: null,
      canonicalUrl: 'https://marketplace.example.com/products/category/sukni',
      ogTitle: null,
      ogDescription: null,
      ogImageUrl: null,
      noIndex: false,
      noFollow: false,
      source: 'generated',
      breadcrumbJsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [],
      },
    })

    expect(metadata.title).toBe('Сукні купити онлайн | Marketplace')
    expect(metadata.alternates?.canonical).toBe('https://marketplace.example.com/products/category/sukni')
  })

  it('forces search pages to noindex', () => {
    const metadata = buildSearchMetadata(
      {
        entityType: SeoEntityType.PAGE,
        entityId: 'search',
        pageKey: 'search',
        title: 'Marketplace',
        description: null,
        keywords: null,
        canonicalUrl: 'https://marketplace.example.com/search',
        ogTitle: null,
        ogDescription: null,
        ogImageUrl: null,
        noIndex: false,
        noFollow: false,
        source: 'generated',
      },
      'сукня',
    )

    expect(metadata.robots).toMatchObject({ index: false, follow: true })
    expect(metadata.title).toBe('Пошук: сукня | Marketplace')
  })
})
