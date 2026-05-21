export const MARKETPLACE_BADGE_TYPES = ['NEW', 'HIT', 'FEATURED'] as const
export const MARKETPLACE_BADGE_SOURCES = ['SYSTEM', 'ADMIN'] as const

export type MarketplaceBadgeType = (typeof MARKETPLACE_BADGE_TYPES)[number]
export type MarketplaceBadgeSource = (typeof MARKETPLACE_BADGE_SOURCES)[number]

export type MarketplaceProductBadge = {
  id?: string
  type: MarketplaceBadgeType
  source?: MarketplaceBadgeSource
  score?: string | null
  startsAt?: string | null
  endsAt?: string | null
}
