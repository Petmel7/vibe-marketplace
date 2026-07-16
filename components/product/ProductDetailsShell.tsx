import type { ReactNode } from 'react'

interface ProductDetailsShellProps {
  gallery: ReactNode
  purchasePanel: ReactNode
  reviews: ReactNode
}

export default function ProductDetailsShell({
  gallery,
  purchasePanel,
  reviews,
}: ProductDetailsShellProps) {
  return (
    <div className="grid gap-y-8 gap-x-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] lg:items-start xl:gap-x-6">
      <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
        {gallery}
      </div>

      <div className="order-2 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:sticky lg:top-24">
        {purchasePanel}
      </div>

      <div className="order-3 min-w-0 lg:col-start-1 lg:row-start-2">
        {reviews}
      </div>
    </div>
  )
}
