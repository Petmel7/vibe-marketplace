export const STORE_ASSET_BUCKET = 'store-assets' as const
export const PRODUCT_IMAGE_BUCKET = 'product-images' as const
export const HERO_BANNER_BUCKET = 'hero-banners' as const

export type StoreAssetKind = 'logo' | 'banner'
export type HeroBannerImageSlot = 'desktop' | 'tablet' | 'mobile'
export type MediaBucket =
  | typeof STORE_ASSET_BUCKET
  | typeof PRODUCT_IMAGE_BUCKET
  | typeof HERO_BANNER_BUCKET

export type UploadedMediaAssetDto = {
  bucket: MediaBucket
  url: string
  storagePath: string
  contentType: string
  size: number
}
