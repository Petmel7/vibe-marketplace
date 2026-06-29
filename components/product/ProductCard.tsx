'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import WishlistToggleButton from '../wishlist/WishlistToggleButton'
import ProductCardAddToCartButton from './ProductCardAddToCartButton'
import ProductStockBadge from './ProductStockBadge'
import {
  getDefaultProductVariantId,
  getProductCardDisplayState,
  type ProductCardProductLike,
} from './productCard.selectors'
import { resolveProductBadgeChips } from './productBadges'
import type { ProductStockStatus } from '@/features/products/product.dto'
import type { VisibleProductPromotionDto } from '@/features/promotions/promotions.dto'
import type { ReviewRatingSummaryDto } from '@/features/review/review.dto'
import { formatPrice } from '@/utils/formatters/price'
import type {
  MarketplaceBadgeContext,
  MarketplaceProductBadge,
} from '@/types/product-badges'

const PRODUCT_CARD_FALLBACK_IMAGE = '/placeholder.png'

interface ProductCardProps {
  id: string
  name: string
  imageAlt?: string | null
  imageUrl: string
  stockStatus?: ProductStockStatus
  badgeContext?: MarketplaceBadgeContext
  badges?: MarketplaceProductBadge[]
  storeName?: string | null
  ratingSummary?: ReviewRatingSummaryDto
  promotionSummary?: VisibleProductPromotionDto | null
  product: ProductCardProductLike
}

function getPromotionDiscountLabel(promotion: VisibleProductPromotionDto) {
  if (promotion.discountType === 'PERCENTAGE') {
    return `${promotion.discountValue}%`
  }

  return formatPrice(promotion.discountValue)
}

export default function ProductCard({
  id,
  name,
  imageAlt,
  imageUrl,
  stockStatus,
  badgeContext,
  badges,
  storeName,
  ratingSummary,
  promotionSummary,
  product,
}: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const { price, sku, isAvailable } = getProductCardDisplayState(product)
  const badgeChips = resolveProductBadgeChips({
    badges,
    badgeContext,
  })
  const defaultVariantId = getDefaultProductVariantId(product)
  const resolvedImageUrl = imageFailed
    ? PRODUCT_CARD_FALLBACK_IMAGE
    : imageUrl || PRODUCT_CARD_FALLBACK_IMAGE

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-panelBorder bg-panel shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-lg">
      <div className="relative">
        <div className="absolute right-3 top-3 z-10">
          <WishlistToggleButton productId={id} variant="card" />
        </div>

        <Link
          href={`/products/${id}`}
          aria-label={`Переглянути товар ${name}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-inset"
        >
          <div className="relative aspect-[4/4.6] overflow-hidden border-b border-panelBorder bg-copy-base/40">
            {badgeChips.length > 0 ? (
              <div
                className="absolute left-3 top-3 z-10 flex flex-wrap gap-2"
                aria-label="Marketplace badges"
              >
                {badgeChips.map((badge) => (
                  <span
                    key={badge.type}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}

            <Image
              src={resolvedImageUrl}
              alt={imageAlt?.trim() || name}
              fill
              sizes="(min-width: 1280px) 23vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 375px) 50vw, 100vw"
              className="object-contain p-4 transition duration-300 group-hover:scale-[1.02] sm:p-5"
              onError={() => setImageFailed(true)}
            />
          </div>
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="space-y-2">
          {storeName ? (
            <p className="text-xs uppercase tracking-[0.16em] text-copy-muted">
              {storeName}
            </p>
          ) : null}

          <Link
            href={`/products/${id}`}
            className="block text-base font-semibold leading-6 text-copy-strong transition group-hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
          >
            {name}
          </Link>

          <div className="flex min-h-6 flex-wrap items-center gap-2">
            {stockStatus ? <ProductStockBadge status={stockStatus} /> : null}
            {sku ? <span className="ui-meta-text">Арт.: {sku}</span> : null}
          </div>

          {promotionSummary ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-full bg-amber-300/20 px-2.5 py-1 text-amber-200">
                Акція
              </span>
              <span className="rounded-full border border-amber-300/30 px-2.5 py-1 text-copy-secondary">
                {getPromotionDiscountLabel(promotionSummary)}
              </span>
              {promotionSummary.code ? (
                <span className="rounded-full border border-brand-accent/30 px-2.5 py-1 text-copy-secondary">
                  {promotionSummary.code}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex min-h-5 items-center gap-2 text-sm text-copy-muted">
            {ratingSummary && ratingSummary.totalCount > 0 ? (
              <>
                <span className="font-medium text-amber-300">
                  ★ {ratingSummary.averageRating.toFixed(1)}
                </span>
                <span>({ratingSummary.totalCount})</span>
              </>
            ) : (
              <span>Без відгуків</span>
            )}
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold leading-none text-copy-strong">
              {formatPrice(price)}
            </p>
            {!isAvailable ? (
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-copy-muted">
                Недоступно
              </span>
            ) : null}
          </div>

          {defaultVariantId ? (
            <ProductCardAddToCartButton
              variantId={defaultVariantId}
              productName={name}
              disabled={!isAvailable}
              disabledLabel="Немає в наявності"
            />
          ) : null}
        </div>
      </div>
    </article>
  )
}
