import type { ReactNode } from 'react'

interface ProductDetailsShellProps {
  gallery: ReactNode
  purchasePanel: ReactNode
}

export default function ProductDetailsShell({
  gallery,
  purchasePanel,
}: ProductDetailsShellProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] lg:items-start xl:gap-12">
      <div className="min-w-0">{gallery}</div>
      <div className="min-w-0 lg:sticky lg:top-24">{purchasePanel}</div>
    </div>
  )
}
