import { describe, expect, it } from 'vitest'
import { getHeroBannerCtaHref } from '@/components/hero/heroBanner.links'
import type { HeroBanner } from '@/types/hero-banners'

function makeBanner(destination: HeroBanner['destination']): HeroBanner {
  return {
    id: 'banner-1',
    eyebrow: null,
    title: 'Hero',
    subtitle: null,
    description: null,
    desktopImageUrl: 'https://example.com/hero.jpg',
    desktopImageStoragePath: null,
    tabletImageUrl: null,
    tabletImageStoragePath: null,
    mobileImageUrl: null,
    mobileImageStoragePath: null,
    imageAlt: 'Hero image',
    backgroundColor: '#1d2533',
    textColor: '#ffffff',
    overlayOpacity: '0.35',
    ctaText: 'Переглянути',
    destination,
    sortOrder: 0,
    status: 'PUBLISHED',
    autoplay: true,
    autoplayDelay: 5000,
    openInNewTab: false,
    publishStartAt: '2026-07-29T00:00:00.000Z',
    publishEndAt: null,
    createdById: 'admin-1',
    updatedById: null,
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
  }
}

const emptyDestinationFields = {
  categoryId: null,
  categorySlug: null,
  productId: null,
  storeId: null,
  storeSlug: null,
  promotionId: null,
  promotionCode: null,
  searchQuery: null,
  customUrl: null,
}

describe('getHeroBannerCtaHref', () => {
  it('builds safe internal links for supported destinations', () => {
    expect(
      getHeroBannerCtaHref(
        makeBanner({
          ...emptyDestinationFields,
          type: 'CATEGORY',
          categoryId: 'category-1',
          categorySlug: 'zhinky',
        }),
      ),
    ).toBe('/products/category/zhinky')

    expect(
      getHeroBannerCtaHref(
        makeBanner({
          ...emptyDestinationFields,
          type: 'PRODUCT',
          productId: 'product-1',
        }),
      ),
    ).toBe('/products/product-1')

    expect(
      getHeroBannerCtaHref(
        makeBanner({
          ...emptyDestinationFields,
          type: 'STORE',
          storeId: 'store-1',
          storeSlug: 'maria',
        }),
      ),
    ).toBe('/search?store=maria')

    expect(
      getHeroBannerCtaHref(
        makeBanner({
          ...emptyDestinationFields,
          type: 'PROMOTION',
          promotionId: 'promotion-1',
          promotionCode: 'SUMMER20',
        }),
      ),
    ).toBe('/search?q=SUMMER20')
  })

  it('rejects unsafe custom URLs', () => {
    expect(
      getHeroBannerCtaHref(
        makeBanner({
          ...emptyDestinationFields,
          type: 'CUSTOM_URL',
          customUrl: 'https://example.com',
        }),
      ),
    ).toBeNull()

    expect(
      getHeroBannerCtaHref(
        makeBanner({
          ...emptyDestinationFields,
          type: 'CUSTOM_URL',
          customUrl: '/collections/new',
        }),
      ),
    ).toBe('/collections/new')
  })
})
