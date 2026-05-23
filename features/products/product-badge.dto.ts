import type { ProductBadgeSource, ProductBadgeType } from '@/app/generated/prisma/client'

export type ProductBadgeDto = {
  id: string
  productId: string
  type: ProductBadgeType
  source: ProductBadgeSource
  score: string | null
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
}

export type ProductBadgeListDto = {
  items: ProductBadgeDto[]
  total: number
  page: number
  totalPages: number
}

export type ProductMetricsDto = {
  productId: string
  viewCount: number
  wishlistCount: number
  soldCount: number
  revenueAmount: string
  ratingAvg: string
  reviewCount: number
  hitScore: string
  lastCalculatedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ProductMetricsListDto = {
  items: ProductMetricsDto[]
  total: number
  page: number
  totalPages: number
}

export type CreateAdminProductBadgeDto = {
  type: Extract<ProductBadgeType, 'HIT' | 'FEATURED'>
  startsAt?: Date | null
  endsAt?: Date | null
  score?: string | null
}

export type ProductBadgeRuleDto = {
  id: string
  badgeType: ProductBadgeType
  minViews: number
  minWishlists: number
  minSoldCount: number
  minRevenueAmount: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  updatedBy: string | null
}

export type ProductBadgeRuleListDto = {
  items: ProductBadgeRuleDto[]
}

export type UpdateHitBadgeRuleDto = {
  minViews?: number
  minWishlists?: number
  minSoldCount?: number
  minRevenueAmount?: string
  enabled?: boolean
}
