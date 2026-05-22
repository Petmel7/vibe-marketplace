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

export interface ProductModerationFilters {
  page: number
  limit: number
}
