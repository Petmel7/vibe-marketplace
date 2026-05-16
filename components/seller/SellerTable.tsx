import type { ReactNode } from 'react'

export default function SellerTable({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="ui-elevated-panel overflow-hidden">
      <header className="border-b border-panelBorder px-5 py-5 sm:px-6">
        <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
        {description ? <p className="mt-1 text-sm text-copy-muted">{description}</p> : null}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}
