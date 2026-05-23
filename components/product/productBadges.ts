import type {
  MarketplaceProductBadge,
  MarketplaceBadgeType,
  MarketplaceBadgeContext,
} from '@/types/product-badges'

type LegacyBadgeFlags = {
  badges?: MarketplaceProductBadge[] | null
  badgeContext?: MarketplaceBadgeContext
}

export type ProductBadgeChip = {
  type: MarketplaceBadgeType
  label: string
  className: string
}

const PRODUCT_BADGE_PRIORITY: MarketplaceBadgeType[] = ['FEATURED', 'HIT', 'NEW']

const PRODUCT_BADGE_COPY: Record<MarketplaceBadgeType, ProductBadgeChip> = {
  FEATURED: {
    type: 'FEATURED',
    label: 'Featured',
    className: 'bg-copy-strong text-white',
  },
  HIT: {
    type: 'HIT',
    label: 'Хіт',
    className: 'bg-brand-accent text-white',
  },
  NEW: {
    type: 'NEW',
    label: 'Новинка',
    className: 'bg-brand-accent-new text-white',
  },
}

export function resolveProductBadgeChips({
  badges,
  badgeContext,
}: LegacyBadgeFlags): ProductBadgeChip[] {
  if (badgeContext && badgeContext !== 'DEFAULT') {
    const contextualBadges = (badges ?? []).filter((badge) => badge.type === badgeContext)

    if (contextualBadges.length > 0) {
      return contextualBadges
        .map((badge) => PRODUCT_BADGE_COPY[badge.type])
        .filter(Boolean)
    }

    return []
  }

  const activeTypes = new Set<MarketplaceBadgeType>()

  for (const badge of badges ?? []) {
    if (PRODUCT_BADGE_COPY[badge.type]) {
      activeTypes.add(badge.type)
    }
  }

  if (activeTypes.size === 0) {
    return []
  }

  return PRODUCT_BADGE_PRIORITY
    .filter((type) => activeTypes.has(type))
    .map((type) => PRODUCT_BADGE_COPY[type])
}
