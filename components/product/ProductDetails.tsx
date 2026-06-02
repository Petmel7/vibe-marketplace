'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Share2 } from 'lucide-react'
import ProductVariantSelector from './ProductVariantSelector'
import WishlistToggleButton from '../wishlist/WishlistToggleButton'
import ProductQuantitySelector from './ProductQuantitySelector'
import AddToCartButton from '../cart/AddToCartButton'
import ProductDescription from './ProductDescription'
import ProductCharacteristics from './ProductCharacteristics'
import ProductInfoSection from './ProductInfoSection'
import ProductPurchasePanel from './ProductPurchasePanel'
import ProductStockBadge from './ProductStockBadge'
import ReportButton from '@/components/abuse-reports/ReportButton'
import {
  getDefaultProductVariantId,
  getProductPresentationState,
} from './productCard.selectors'
import { resolveProductBadgeChips } from './productBadges'
import { useRecordViewedProduct } from '../viewed/hooks/useRecordViewedProduct'
import type { ProductDetailDto } from '@/features/products/product.dto'
import type { SessionUser } from '@/types/auth'
import type { MarketplaceBadgeContext, MarketplaceProductBadge } from '@/types/product-badges'
import { formatPrice } from '@/utils/formatters/price'

interface Props {
  product: ProductDetailDto & {
    badges?: MarketplaceProductBadge[]
    badgeContext?: MarketplaceBadgeContext
  }
  currentUser: SessionUser | null
}

export default function ProductDetails({ product, currentUser }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() =>
    getDefaultProductVariantId(product),
  )
  const [quantity, setQuantity] = useState(1)
  const presentation = getProductPresentationState(product, selectedVariantId)
  const badgeChips = resolveProductBadgeChips({
    badges: product.badges,
    badgeContext: product.badgeContext ?? 'DEFAULT',
  })

  useRecordViewedProduct(product.id)

  return (
    <div className="flex flex-col gap-6">
      <ProductPurchasePanel>
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {product.categoryName && product.categorySlug ? (
                  <Link
                    href={`/products/category/${product.categorySlug}`}
                    className="inline-flex items-center rounded-full border border-panelBorder bg-copy-base px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-copy-muted transition hover:border-brand-accent/40 hover:text-copy-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
                  >
                    {product.categoryName}
                  </Link>
                ) : null}
                <span className="text-sm text-copy-muted">{product.storeName}</span>
                <ReportButton
                  currentUser={currentUser}
                  targetType="STORE"
                  targetId={product.storeId}
                  triggerLabel="Поскаржитися на магазин"
                  triggerClassName="rounded-full border border-panelBorder bg-copy-base px-3 py-1 text-xs font-medium text-copy-muted transition hover:border-brand-accent/40 hover:text-copy-strong"
                  title="Поскаржитися на магазин"
                />
              </div>

              <h1 className="ui-heading-product">{product.name}</h1>
            </div>

            <div className="shrink-0 pt-1">
              <div className="flex items-center gap-3">
                <ReportButton
                  currentUser={currentUser}
                  targetType="PRODUCT"
                  targetId={product.id}
                  triggerLabel="Поскаржитися"
                  triggerClassName="ui-secondary-button"
                  title="Поскаржитися на товар"
                />
                <WishlistToggleButton productId={product.id} />
                <button aria-label="Поділитися" className="ui-icon-button">
                  <Share2 size={24} color="#A5A8AD" />
                </button>
              </div>
            </div>
          </div>

          <p className="ui-price-hero">{formatPrice(presentation.price)}</p>

          {product.ratingSummary.totalCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-copy-secondary">
              <span className="font-semibold text-copy-strong">
                {product.ratingSummary.averageRating.toFixed(1)} / 5
              </span>
              <span>
                {product.ratingSummary.totalCount}{' '}
                {product.ratingSummary.totalCount === 1
                  ? 'відгук'
                  : product.ratingSummary.totalCount < 5
                    ? 'відгуки'
                    : 'відгуків'}
              </span>
            </div>
          ) : (
            <p className="text-sm text-copy-muted">Ще немає опублікованих відгуків про цей товар.</p>
          )}

          {badgeChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2" aria-label="Marketplace badges">
              {badgeChips.map((badge) => (
                <span
                  key={badge.type}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <ProductStockBadge status={presentation.stockStatus} />
            {presentation.sku ? <span className="ui-meta-text"> Арт.: {presentation.sku}</span> : null}
          </div>

          {!presentation.isAvailable ? (
            <p
              className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
              aria-live="polite"
            >
              Обраний варіант зараз недоступний для покупки. Товар лишається видимим у каталозі, але додавання в кошик вимкнено, доки запас не з’явиться знову.
            </p>
          ) : presentation.stockStatus === 'LOW_STOCK' ? (
            <p
              className="rounded-2xl border border-amber-300/40 bg-amber-300/15 px-4 py-3 text-sm text-copy-primary"
              aria-live="polite"
            >
              Залишилось небагато: доступно {presentation.maxQty} шт.
            </p>
          ) : null}

          <ProductVariantSelector
            variants={product.variants}
            selectedVariantId={presentation.selectedVariantId}
            onSelect={setSelectedVariantId}
          />

          <ProductQuantitySelector
            quantity={quantity}
            onChange={setQuantity}
            max={Math.max(presentation.maxQty, 1)}
          />

          <AddToCartButton
            variantId={presentation.selectedVariantId}
            quantity={quantity}
            disabled={!presentation.isAvailable}
            disabledLabel="Немає в наявності"
          />
        </div>
      </ProductPurchasePanel>

      <ProductInfoSection title="Деталі товару">
        <div className="space-y-4">
          <ProductDescription description={product.description} />
          <ProductCharacteristics variants={product.variants} sku={presentation.sku ?? null} />
        </div>
      </ProductInfoSection>
    </div>
  )
}
