import type { ProductStatus } from '@/app/generated/prisma/client'

export type SellerVariantDto = {
  id: string
  productId: string
  sku: string
  size: string | null
  color: string | null
  price: string | null
  stock: number
  createdAt: Date
  updatedAt: Date
}

export type SellerProductDto = {
  id: string
  storeId: string
  categoryId: string | null
  name: string
  description: string | null
  price: string
  imageUrl: string | null
  sku: string | null
  isHit: boolean
  isNew: boolean
  status: ProductStatus
  rejectionReason: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  variants: SellerVariantDto[]
}

export type SellerProductSummaryDto = {
  id: string
  name: string
  price: string
  status: ProductStatus
  totalStock: number
  createdAt: Date
}

export type CreateSellerProductDto = {
  name: string
  description?: string | null
  price: string
  imageUrl?: string | null
  sku?: string | null
  isHit?: boolean
  isNew?: boolean
  categoryId?: string | null
  variants?: Array<{
    sku?: string
    size?: string | null
    color?: string | null
    price?: string | null
    stock?: number
  }>
}

export type UpdateSellerProductDto = Partial<Omit<CreateSellerProductDto, 'variants'>>

export type CreateVariantDto = {
  sku?: string
  size?: string | null
  color?: string | null
  price?: string | null
  stock?: number
}

export type UpdateVariantDto = Partial<CreateVariantDto>
