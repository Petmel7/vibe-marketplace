'use client'

import ProductCardGrid from '@/components/product/ProductCardGrid'
import ProductCardSkeleton from '@/components/product/ProductCardSkeleton'
import type { ProductListItem } from '@/components/product/productListItem'
import { useInfiniteProducts } from '@/components/product/useInfiniteProducts'

interface Props {
  type: 'new' | 'hit'
  initialProducts: ProductListItem[]
  initialPage: number
  initialHasNextPage: boolean
  emptyMessage: string
}

export default function InfiniteProductList({
  type,
  initialProducts,
  initialPage,
  initialHasNextPage,
  emptyMessage,
}: Props) {
  const { products, hasNextPage, isLoading, setObserverTarget } = useInfiniteProducts({
    type,
    initialProducts,
    initialPage,
    initialHasNextPage,
  })

  if (products.length === 0) {
    return <p className="ui-body-muted">{emptyMessage}</p>
  }

  return (
    <div className="space-y-4">
      <ProductCardGrid products={products} />

      {isLoading ? <ProductCardSkeleton count={4} /> : null}

      {hasNextPage ? <div ref={setObserverTarget} className="h-1 w-full" aria-hidden="true" /> : null}
    </div>
  )
}
