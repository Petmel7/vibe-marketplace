import type {
  HeroBannerDestinationType,
  HeroBannerStatus,
} from '@/types/hero-banners'

export type PreviewMode = 'desktop' | 'tablet' | 'mobile'

export type HeroBannerFormValues = {
  eyebrow: string
  title: string
  subtitle: string
  description: string
  desktopImageUrl: string
  desktopImageStoragePath: string
  tabletImageUrl: string
  tabletImageStoragePath: string
  mobileImageUrl: string
  mobileImageStoragePath: string
  imageAlt: string
  backgroundColor: string
  textColor: string
  overlayOpacity: string
  ctaText: string
  destinationType: HeroBannerDestinationType
  destinationTarget: string
  openInNewTab: boolean
  autoplay: boolean
  autoplayDelay: string
  sortOrder: string
  status: HeroBannerStatus
  publishStartAt: string
  publishEndAt: string
}

export type HeroBannerFormErrors = Partial<Record<keyof HeroBannerFormValues | 'form', string>>
