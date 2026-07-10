import type { ReactNode } from 'react'

export default function ProductPurchasePanel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-panelBorder bg-panel/90 p-5 shadow-sm backdrop-blur sm:p-6">
      {children}
    </section>
  )
}
