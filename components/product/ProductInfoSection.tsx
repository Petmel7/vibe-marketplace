import type { ReactNode } from 'react'

interface ProductInfoSectionProps {
  children: ReactNode
  title?: string
}

export default function ProductInfoSection({
  children,
  title,
}: ProductInfoSectionProps) {
  return (
    <section className="rounded-[28px] border border-panelBorder bg-panel px-5 py-5 shadow-sm sm:px-6">
      {title ? <h2 className="mb-4 text-lg font-semibold text-copy-strong">{title}</h2> : null}
      {children}
    </section>
  )
}
