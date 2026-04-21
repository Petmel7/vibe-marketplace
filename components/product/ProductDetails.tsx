'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import ProductVariantSelector from './ProductVariantSelector'
import WishlistToggleButton from './WishlistToggleButton'
import ProductQuantitySelector from './ProductQuantitySelector'
import AddToCartButton from './AddToCartButton'
import ProductDescription from './ProductDescription'
import ProductCharacteristics from './ProductCharacteristics'
import {
  getDefaultProductVariantId,
  getProductPresentationState,
} from './productCard.selectors'
import { useRecordViewedProduct } from './useRecordViewedProduct'
import type { ProductDetailDto } from '@/features/products/product.dto'
import { formatPrice } from '@/lib/formatters/price'

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
        <h1 className="font-bold text-[24px] leading-8 text-[#F1F3F5]">
          {product.name}
        </h1>
        <div className="flex items-center gap-3 shrink-0 pt-1">
          <WishlistToggleButton productId={product.id} />
          <button aria-label="РџРѕРґС–Р»РёС‚РёСЃСЏ" className="hover:opacity-70 transition-opacity">
            <Share2 size={24} color="#A5A8AD" />
          </button>
        </div>
      </div>

      <p className="font-medium text-[28px] leading-8 text-[#16D9A6]">
        {formatPrice(presentation.price)}
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        {presentation.isAvailable && (
          <span className="flex items-center gap-1 font-normal text-[10px] leading-3 text-[#26DA72]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#26DA72] shrink-0" />
            В наявності
          </span>
        )}
        {presentation.sku && (
          <span className="font-normal text-[10px] leading-3 text-[#A5A8AD]">
            Арт: {presentation.sku}
          </span>
        )}
      </div>

      <ProductVariantSelector
        variants={product.variants}
        selectedVariantId={presentation.selectedVariantId}
        onSelect={setSelectedVariantId}
      />

      <ProductQuantitySelector
        quantity={quantity}
        onChange={setQuantity}
        max={presentation.maxQty}
      />

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
