import type { MarketplaceProductBadge, MarketplaceBadgeType } from '@/types/product-badges'

type LegacyBadgeFlags = {
  badges?: MarketplaceProductBadge[] | null
  isHit?: boolean
  isNew?: boolean
  badgeVariant?: 'hit' | 'new'
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

function badgeVariantToType(variant: 'hit' | 'new' | undefined): MarketplaceBadgeType | null {
  if (variant === 'hit') return 'HIT'
  if (variant === 'new') return 'NEW'
  return null
}

export function resolveProductBadgeChips({
  badges,
  isHit,
  isNew,
  badgeVariant,
}: LegacyBadgeFlags): ProductBadgeChip[] {
  const activeTypes = new Set<MarketplaceBadgeType>()

  for (const badge of badges ?? []) {
    if (PRODUCT_BADGE_COPY[badge.type]) {
      activeTypes.add(badge.type)
    }
  }

  if (activeTypes.size === 0) {
    const forcedType = badgeVariantToType(badgeVariant)
    if (forcedType) {
      activeTypes.add(forcedType)
    } else {
      if (isHit) activeTypes.add('HIT')
      if (isNew) activeTypes.add('NEW')
    }
  }

  return PRODUCT_BADGE_PRIORITY
    .filter((type) => activeTypes.has(type))
    .map((type) => PRODUCT_BADGE_COPY[type])
}
