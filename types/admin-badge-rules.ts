export const ADMIN_BADGE_RULE_TYPES = ['NEW', 'HIT', 'FEATURED'] as const

export type AdminBadgeRuleType = (typeof ADMIN_BADGE_RULE_TYPES)[number]

export type AdminBadgeRule = {
  id: string
  badgeType: AdminBadgeRuleType
  minViews: number
  minWishlists: number
  minSoldCount: number
  minRevenueAmount: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  updatedBy: string | null
}

export type AdminBadgeRuleListResponse = {
  items: AdminBadgeRule[]
}

export type UpdateHitBadgeRulePayload = {
  minViews: number
  minWishlists: number
  minSoldCount: number
  minRevenueAmount: string
  enabled: boolean
}
