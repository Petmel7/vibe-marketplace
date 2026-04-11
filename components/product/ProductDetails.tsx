'use client'

import { useState } from 'react'
import { Heart, Share2 } from 'lucide-react'
import ProductVariantSelector from './ProductVariantSelector'
import ProductQuantitySelector from './ProductQuantitySelector'
import AddToCartButton from './AddToCartButton'
import ProductDescription from './ProductDescription'
import ProductCharacteristics from './ProductCharacteristics'
import type { ProductDetailDto } from '@/features/products/product.dto'

interface Props {
  product: ProductDetailDto
}

export default function ProductDetails({ product }: Props) {
  const firstVariantId = product.variants[0]?.id ?? null
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(firstVariantId)
  const [quantity, setQuantity] = useState(1)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null
  const displayPrice = selectedVariant?.price ?? product.price
  const maxQty = selectedVariant?.stock ?? 99

  return (
    <div className="flex flex-col gap-5">
      {/* Name + action icons */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-bold text-[24px] leading-8 text-[#F1F3F5]">
          {product.name}
        </h1>
        <div className="flex items-center gap-3 shrink-0 pt-1">
          <button aria-label="Додати до обраного" className="hover:opacity-70 transition-opacity">
            <Heart size={24} color="#A5A8AD" />
          </button>
          <button aria-label="Поділитися" className="hover:opacity-70 transition-opacity">
            <Share2 size={24} color="#A5A8AD" />
          </button>
        </div>
      </div>

      {/* Price */}
      <p className="font-medium text-[28px] leading-8 text-[#16D9A6]">
        {Number(displayPrice).toLocaleString('uk-UA')} ₴
      </p>

      {/* Availability + article */}
      <div className="flex items-center gap-3 flex-wrap">
        {product.isActive && (
          <span className="flex items-center gap-1 font-normal text-[10px] leading-3 text-[#26DA72]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#26DA72] shrink-0" />
            В наявності
          </span>
        )}
        {product.sku && (
          <span className="font-normal text-[10px] leading-3 text-[#A5A8AD]">
            Арт.: {product.sku}
          </span>
        )}
      </div>

      {/* Variant selector */}
      <ProductVariantSelector
        variants={product.variants}
        selectedVariantId={selectedVariantId}
        onSelect={setSelectedVariantId}
      />

      {/* Quantity selector */}
      <ProductQuantitySelector
        quantity={quantity}
        onChange={setQuantity}
        max={maxQty}
      />

      {/* Add to cart */}
      <AddToCartButton
        productId={product.id}
        variantId={selectedVariantId}
        quantity={quantity}
      />

      {/* Description */}
      <ProductDescription description={product.description} />

      {/* Characteristics */}
      <ProductCharacteristics variants={product.variants} sku={product.sku} />
    </div>
  )
}
