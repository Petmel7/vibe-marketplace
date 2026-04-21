'use client'

import ProductCard from './ProductCard'
import { useViewedProducts } from './useViewedProducts'

interface Props {
  currentProductId: string
}

export default function RecentlyViewed({ currentProductId }: Props) {
  const { items, isLoading } = useViewedProducts(currentProductId)

  if (isLoading) {
    return (
      <section className="mt-10">
        <h2 className="font-bold text-[16px] text-[#F1F3F5] mb-4">Нещодавно переглянуті товари</h2>
        <div className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-51.75 h-95 rounded-2xl bg-[#2A323F] animate-pulse"
            />
          ))}
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="font-bold text-[16px] text-[#F1F3F5] mb-4">Нещодавно переглянуті товари</h2>
      <div className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory]">
        {items.map((item) => (
          <div key={item.id} className="shrink-0 w-51.75 snap-start">
            <ProductCard
              id={item.productId}
              name={item.name}
              imageUrl={item.imageUrl ?? '/logo.svg'}
              product={{ price: item.price, sku: null, variants: [] }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
