import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function DashboardSidebarIdentity({
  eyebrow,
  title,
  subtitle,
  subtitleTitle,
  truncateSubtitle = true,
  children,
}: {
  eyebrow: string
  title: string
  subtitle?: ReactNode
  subtitleTitle?: string
  truncateSubtitle?: boolean
  children?: ReactNode
}) {
  return (
    <section className="ui-elevated-panel p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">{eyebrow}</p>
      <h2 className="mt-3 truncate text-xl font-semibold text-copy-strong" title={title}>
        {title}
      </h2>
      {subtitle ? (
        <p className={clsx('mt-1 text-sm text-copy-muted', truncateSubtitle && 'truncate')} title={subtitleTitle}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </section>
  )
}
