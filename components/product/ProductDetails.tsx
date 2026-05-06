'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import ProductVariantSelector from './ProductVariantSelector'
import WishlistToggleButton from '../wishlist/WishlistToggleButton'
import ProductQuantitySelector from './ProductQuantitySelector'
import AddToCartButton from '../cart/AddToCartButton'
import ProductDescription from './ProductDescription'
import ProductCharacteristics from './ProductCharacteristics'
import {
  getDefaultProductVariantId,
  getProductPresentationState,
} from './productCard.selectors'
import { useRecordViewedProduct } from '../viewed/hooks/useRecordViewedProduct'
import type { ProductDetailDto } from '@/features/products/product.dto'
import { formatPrice } from '@/utils/formatters/price'

interface Props {
  product: ProductDetailDto
}

export default function ProductDetails({ product }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() =>
    getDefaultProductVariantId(product)
  )
  const [quantity, setQuantity] = useState(1)
  const presentation = getProductPresentationState(product, selectedVariantId)

  useRecordViewedProduct(product.id)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="ui-heading-product">{product.name}</h1>
        <div className="flex items-center gap-3 shrink-0 pt-1">
          <WishlistToggleButton productId={product.id} />
          <button aria-label="РџРѕРґС–Р»РёС‚РёСЃСЏ" className="ui-icon-button">
            <Share2 size={24} color="#A5A8AD" />
          </button>
        </div>
      </div>

      <p className="ui-price-hero">{formatPrice(presentation.price)}</p>

      <div className="flex flex-wrap items-center gap-3">
        {presentation.isAvailable && (
          <span className="ui-status-badge">
            <span className="ui-status-dot" />
            В наявності
          </span>
        )}
        {presentation.sku && <span className="ui-meta-text"> Арт.: {presentation.sku}</span>}
      </div>

      <ProductVariantSelector
        variants={product.variants}
        selectedVariantId={presentation.selectedVariantId}
        onSelect={setSelectedVariantId}
      />

      <ProductQuantitySelector quantity={quantity} onChange={setQuantity} max={presentation.maxQty} />

      <AddToCartButton
        productId={product.id}
        variantId={presentation.selectedVariantId}
        quantity={quantity}
      />

      <ProductDescription description={product.description} />
      <ProductCharacteristics variants={product.variants} sku={presentation.sku ?? null} />
    </div>
  )
}
