import type { ProductStatus } from '@/app/generated/prisma/client'

export interface ProductModerationDto {
  id: string
  name: string
  storeId: string
  storeName: string
  status: ProductStatus
  moderationReason: string | null
  rejectionReason: string | null
  publishedAt: Date | null
  moderatedAt: Date | null
  moderatedBy: string | null
  createdAt: Date
}

export interface ProductModerationQueueDto {
  items: ProductModerationDto[]
  total: number
  page: number
  limit: number
}

export interface ProductModerationImageDto {
  id: string
  url: string
  altText: string | null
  isPrimary: boolean
  position: number
}

export interface ProductModerationVariantDto {
  id: string
  sku: string
  size: string | null
  color: string | null
  price: string | null
  stock: number
}

export interface ProductModerationDetailDto extends ProductModerationDto {
  description: string | null
  price: string
  imageUrl: string | null
  sku: string | null
  categoryId: string | null
  categoryName: string | null
  categorySlug: string | null
  storeSlug: string
  storeOwnerId: string
  storeOwnerEmail: string | null
  sellerBusinessName: string | null
  images: ProductModerationImageDto[]
  variants: ProductModerationVariantDto[]
  updatedAt: Date
}

export interface ProductModerationFilters {
  page: number
  limit: number
}
