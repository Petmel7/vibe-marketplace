'use client'

import Image from 'next/image'
import { Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import WishlistToggleButton from '../wishlist/WishlistToggleButton'
import { getProductCardDisplayState, type ProductCardProductLike } from './productCard.selectors'
import { resolveProductBadgeChips } from './productBadges'
import { formatPrice } from '@/utils/formatters/price'
import type { MarketplaceBadgeContext, MarketplaceProductBadge } from '@/types/product-badges'

interface ProductCardProps {
  id: string
  name: string
  imageUrl: string
  isActive?: boolean
  badgeContext?: MarketplaceBadgeContext
  badges?: MarketplaceProductBadge[]
  product: ProductCardProductLike
}

function ShareIcon() {
  return (
    <button aria-label="Поширити" className="ui-icon-button-card">
      <Share2 size={20} color="#A5A8AD" aria-hidden="true" />
    </button>
  )
}

export default function ProductCard({
  id,
  name,
  imageUrl,
  isActive,
  badgeContext,
  badges,
  product,
}: ProductCardProps) {
  const router = useRouter()
  const { price, sku } = getProductCardDisplayState(product)
  const badgeChips = resolveProductBadgeChips({
    badges,
    badgeContext,
  })

  return (
    <div
      className="ui-product-card"
      onClick={() => router.push(`/products/${id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/products/${id}`)}
      role="link"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
    >
      <div className="ui-product-card-media">
        {badgeChips.length > 0 ? (
          <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-2" aria-label="Marketplace badges">
            {badgeChips.map((badge) => (
              <span
                key={badge.type}
                className={`rounded px-2 text-[13px] font-medium leading-5 ${badge.className}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}

        <div
          className="absolute right-2 top-2 z-10 flex flex-col gap-1 xs:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <WishlistToggleButton productId={id} variant="card" />
          <ShareIcon />
        </div>

        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-contain p-4"
          sizes="(min-width: 480px) 25vw, 207px"
        />
      </div>

      <div className="flex flex-col gap-1 px-3 pb-3 pt-2">
        <p className="truncate text-[14px] font-bold leading-5 text-copy-muted">{name}</p>

        <div className="flex flex-wrap items-center gap-2">
          {isActive && (
            <span className="ui-status-badge">
              <span className="ui-status-dot" />
              В наявності
            </span>
          )}
          {sku && <span className="ui-meta-text"> Арт.: {sku}</span>}
        </div>

        <p className="ui-price-card">{formatPrice(price)}</p>
      </div>
    </div>
  )
}
