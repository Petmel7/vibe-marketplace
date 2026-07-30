import type { HeroBanner } from '@/types/hero-banners'

function safeInternalPath(value: string | null) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://') || /[\u0000-\u001F]/.test(trimmed)) {
    return null
  }

  return trimmed
}

export function getHeroBannerCtaHref(banner: HeroBanner) {
  const destination = banner.destination

  switch (destination.type) {
    case 'CATEGORY':
      return destination.categorySlug
        ? `/products/category/${encodeURIComponent(destination.categorySlug)}`
        : null
    case 'PRODUCT':
      return destination.productId ? `/products/${encodeURIComponent(destination.productId)}` : null
    case 'STORE': {
      const storeTarget = destination.storeSlug ?? destination.storeId
      return storeTarget ? `/search?store=${encodeURIComponent(storeTarget)}` : null
    }
    case 'PROMOTION':
      return destination.promotionCode
        ? `/search?q=${encodeURIComponent(destination.promotionCode)}`
        : null
    case 'SEARCH':
      return destination.searchQuery
        ? `/search?q=${encodeURIComponent(destination.searchQuery)}`
        : null
    case 'CUSTOM_URL':
      return safeInternalPath(destination.customUrl)
    case 'NONE':
      return null
  }
}
