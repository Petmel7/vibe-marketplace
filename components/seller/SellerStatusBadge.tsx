import type { ReactNode } from 'react'

export default function SellerStatusBadge({
  label,
  tone = 'neutral',
  children,
}: {
  label?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  children?: ReactNode
}) {
  const toneClassName = {
    neutral: 'border-panelBorder bg-panel text-copy-primary',
    success: 'border-brand-success/30 bg-brand-success/10 text-brand-success',
    warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    danger: 'border-brand-danger/30 bg-brand-danger/10 text-brand-danger',
    info: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  }[tone]

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${toneClassName}`}>
      {children ?? label}
    </span>
  )
}
