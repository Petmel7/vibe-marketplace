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
        <h2 className="ui-heading-section">Недавно переглянуті товари</h2>
        <div className="ui-scroll-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-95 w-51.75 shrink-0 rounded-2xl bg-panel animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="ui-heading-section">Недавно переглянуті товари</h2>
      <div className="ui-scroll-row-snap">
        {items.map((item) => (
          <div key={item.id} className="w-51.75 shrink-0 snap-start">
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
