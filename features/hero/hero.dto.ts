import type {
  HeroBannerDestinationType,
  HeroBannerStatus,
} from '@/app/generated/prisma/client'

export type HeroBannerDestinationDto = {
  type: HeroBannerDestinationType
  categoryId: string | null
  categorySlug: string | null
  productId: string | null
  storeId: string | null
  storeSlug: string | null
  promotionId: string | null
  promotionCode: string | null
  searchQuery: string | null
  customUrl: string | null
}

export type HeroBannerDto = {
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
  destination: HeroBannerDestinationDto
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

export type HeroBannerListDto = {
  items: HeroBannerDto[]
  total: number
  page: number
  limit: number
}

export type PublicHeroBannerListDto = {
  items: HeroBannerDto[]
}

export type HeroBannerQueryDto = {
  page: number
  limit: number
  status?: HeroBannerStatus
  destinationType?: HeroBannerDestinationType
}

export type PublicHeroBannerQueryDto = {
  limit: number
}

export type HeroBannerWriteDto = {
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

export type HeroBannerUpdateDto = Partial<HeroBannerWriteDto>

export type ReorderHeroBannersDto = {
  items: Array<{
    id: string
    sortOrder: number
  }>
}
