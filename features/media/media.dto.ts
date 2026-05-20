export const STORE_ASSET_BUCKET = 'store-assets' as const
export const PRODUCT_IMAGE_BUCKET = 'product-images' as const

export type StoreAssetKind = 'logo' | 'banner'
export type MediaBucket = typeof STORE_ASSET_BUCKET | typeof PRODUCT_IMAGE_BUCKET

export type UploadedMediaAssetDto = {
  bucket: MediaBucket
  url: string
  storagePath: string
  contentType: string
  size: number
}
