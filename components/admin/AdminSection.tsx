import type { ReactNode } from 'react'

export default function AdminSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">{eyebrow}</p>
        ) : null}
        <h1 className="ui-heading-page">{title}</h1>
        {description ? <p className="max-w-3xl text-sm text-copy-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
