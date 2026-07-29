export const HERO_BANNER_STATUSES = ['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'] as const
export const HERO_BANNER_DESTINATION_TYPES = [
  'NONE',
  'CATEGORY',
  'PRODUCT',
  'STORE',
  'PROMOTION',
  'SEARCH',
  'CUSTOM_URL',
] as const

export type HeroBannerStatus = (typeof HERO_BANNER_STATUSES)[number]
export type HeroBannerDestinationType = (typeof HERO_BANNER_DESTINATION_TYPES)[number]

export type HeroBannerDestination = {
  type: HeroBannerDestinationType
  categoryId: string | null
  productId: string | null
  storeId: string | null
  promotionId: string | null
  searchQuery: string | null
  customUrl: string | null
}

export type HeroBanner = {
  id: string
  eyebrow: string | null
  title: string
  subtitle: string | null
  description: string | null
  desktopImageUrl: string | null
  desktopImageStoragePath: string | null
  tabletImageUrl: string | null
  tabletImageStoragePath: string | null
  mobileImageUrl: string | null
  mobileImageStoragePath: string | null
  imageAlt: string | null
  backgroundColor: string | null
  textColor: string | null
  overlayOpacity: string
  ctaText: string | null
  destination: HeroBannerDestination
  sortOrder: number
  status: HeroBannerStatus
  autoplay: boolean
  autoplayDelay: number | null
  openInNewTab: boolean
  publishStartAt: string
  publishEndAt: string | null
  createdById: string
  updatedById: string | null
  createdAt: string
  updatedAt: string
}

export type HeroBannerList = {
  items: HeroBanner[]
  total: number
  page: number
  limit: number
}

export type HeroBannerPayload = {
  eyebrow?: string | null
  title: string
  subtitle?: string | null
  description?: string | null
  desktopImageUrl?: string | null
  desktopImageStoragePath?: string | null
  tabletImageUrl?: string | null
  tabletImageStoragePath?: string | null
  mobileImageUrl?: string | null
  mobileImageStoragePath?: string | null
  imageAlt?: string | null
  backgroundColor?: string | null
  textColor?: string | null
  overlayOpacity?: number
  ctaText?: string | null
  destinationType?: HeroBannerDestinationType
  categoryId?: string | null
  productId?: string | null
  storeId?: string | null
  promotionId?: string | null
  searchQuery?: string | null
  customUrl?: string | null
  sortOrder?: number
  status?: HeroBannerStatus
  autoplay?: boolean
  autoplayDelay?: number | null
  openInNewTab?: boolean
  publishStartAt?: string
  publishEndAt?: string | null
}

export function getHeroBannerStatusLabel(status: HeroBannerStatus) {
  switch (status) {
    case 'DRAFT':
      return 'Чернетка'
    case 'PUBLISHED':
      return 'Опубліковано'
    case 'PAUSED':
      return 'На паузі'
    case 'ARCHIVED':
      return 'Архів'
  }
}

export function getHeroBannerDestinationTypeLabel(type: HeroBannerDestinationType) {
  switch (type) {
    case 'NONE':
      return 'Без посилання'
    case 'CATEGORY':
      return 'Категорія'
    case 'PRODUCT':
      return 'Товар'
    case 'STORE':
      return 'Магазин'
    case 'PROMOTION':
      return 'Акція'
    case 'SEARCH':
      return 'Пошук'
    case 'CUSTOM_URL':
      return 'Внутрішнє посилання'
  }
}
